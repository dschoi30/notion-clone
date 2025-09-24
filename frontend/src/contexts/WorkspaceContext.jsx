import React, { createContext, useContext, useState, useCallback } from 'react';
import * as workspaceApi from '@/services/workspaceApi';
import { useEffect } from 'react';
import { createLogger } from '@/lib/logger';

const WorkspaceContext = createContext();

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

export function WorkspaceProvider({ children }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const wlog = createLogger('WorkspaceContext');

  const fetchWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      wlog.info(`🔄 fetchWorkspaces 시작`);
      const data = await workspaceApi.getAccessibleWorkspaces();
      wlog.info(`📋 워크스페이스 목록 로드:`, data.map(ws => `${ws.id}(${ws.name})`).join(', '));
      setWorkspaces(data);
      
      // localStorage 기반 설정은 별도 useEffect에서 처리하므로 여기서는 자동 설정하지 않음
      // 이전 로직: if (data.length > 0 && !currentWorkspace) { setCurrentWorkspace(data[0]); }
      // 이는 잘못된 워크스페이스(data[0])를 임시로 설정하여 불필요한 API 호출을 유발함
      
      wlog.info(`✅ fetchWorkspaces 완료: ${data.length}개 워크스페이스`);
    } catch (err) {
      console.error(`❌ fetchWorkspaces 에러:`, err);
      
      // 403 에러는 토큰 만료로 간주하여 에러 상태를 설정하지 않음
      // (api.js에서 자동으로 로그인 페이지로 리다이렉트됨)
      if (err.response?.status === 403) {
        wlog.warn('403 Forbidden - 토큰 만료로 추정, 리다이렉트 예정');
        return; // 에러 상태 설정하지 않고 조용히 종료
      }
      
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []); // currentWorkspace 의존성 제거 - 자동 설정하지 않으므로 불필요

  const createWorkspace = useCallback(async (workspaceData) => {
    try {
      setLoading(true);
      setError(null);
      const newWorkspace = await workspaceApi.createWorkspace(workspaceData);
      setWorkspaces(prev => [...prev, newWorkspace]);
      return newWorkspace;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateWorkspace = useCallback(async (id, workspaceData) => {
    try {
      setLoading(true);
      setError(null);
      const updatedWorkspace = await workspaceApi.updateWorkspace(id, workspaceData);
      setWorkspaces(prev => prev.map(workspace => 
        workspace.id === id ? updatedWorkspace : workspace
      ));
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(updatedWorkspace);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  const deleteWorkspace = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      await workspaceApi.deleteWorkspace(id);
      setWorkspaces(prev => prev.filter(workspace => workspace.id !== id));
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(workspaces.find(w => w.id !== id) || null);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, workspaces]);

  const selectWorkspace = useCallback((workspace) => {
    wlog.info(`🔄 워크스페이스 선택: ${workspace.id}(${workspace.name})`);
    setCurrentWorkspace(workspace);
    localStorage.setItem('selectedWorkspace', workspace.id);
    wlog.info(`💾 localStorage 저장: selectedWorkspace = ${workspace.id}`);
  }, []);

  useEffect(() => {
    const savedId = localStorage.getItem('selectedWorkspace');
    wlog.info(`🏢 WorkspaceContext - savedId: ${savedId}, workspaces.length: ${workspaces.length}`);
    wlog.info(`🏢 현재 workspaces:`, workspaces.map(ws => `${ws.id}(${ws.name})`).join(', '));
    
    if (workspaces.length > 0) {
      if (savedId) {
        const found = workspaces.find(ws =>  String(ws.id) === String(savedId));
        wlog.info(`🔍 savedId ${savedId}로 찾은 워크스페이스:`, found ? `${found.id}(${found.name})` : 'null');
        
        if (found) {
          wlog.info(`✅ 워크스페이스 설정: ${found.id}(${found.name})`);
          setCurrentWorkspace(found);
        } else {
          wlog.info(`⚠️ 저장된 워크스페이스 못 찾음. 첫 번째 워크스페이스 사용: ${workspaces[0].id}(${workspaces[0].name})`);
          setCurrentWorkspace(workspaces[0]);
        }
      } else {
        wlog.info(`📝 저장된 워크스페이스 없음. 첫 번째 워크스페이스 사용: ${workspaces[0].id}(${workspaces[0].name})`);
        setCurrentWorkspace(workspaces[0]);
      }
    }
  }, [workspaces]); // currentWorkspace 의존성 제거하여 중복 설정 방지

  const value = {
    workspaces,
    currentWorkspace,
    loading,
    error,
    isSettingsPanelOpen,
    setIsSettingsPanelOpen,
    isSearchModalOpen,
    setIsSearchModalOpen,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    selectWorkspace
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
} 