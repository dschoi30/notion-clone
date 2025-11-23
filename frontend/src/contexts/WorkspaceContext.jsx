import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as workspaceApi from '@/services/workspaceApi';
import { createLogger } from '@/lib/logger';
import { useErrorHandler } from '@/hooks/useErrorHandler';

const WorkspaceContext = createContext();

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

export function WorkspaceProvider({ children }) {
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const wlog = createLogger('WorkspaceContext');
  const { handleError } = useErrorHandler();

  // React Query로 워크스페이스 목록 조회
  const {
    data: workspacesData,
    isLoading: loading,
    error: workspacesError,
    refetch: refetchWorkspaces,
  } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      wlog.info(`🔄 fetchWorkspaces 시작`);
      const data = await workspaceApi.getAccessibleWorkspaces();
      const filtered = Array.isArray(data) ? data.filter(ws => !ws.isTrashed) : [];
      wlog.info(`📋 워크스페이스 목록 로드:`, filtered.map(ws => `${ws.id}(${ws.name})`).join(', '));
      wlog.info(`✅ fetchWorkspaces 완료: ${filtered.length}개 워크스페이스`);
      return filtered;
    },
    staleTime: 1000 * 60 * 5, // 5분 - 워크스페이스는 자주 변경되지 않음
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (workspacesError) {
      wlog.error('워크스페이스 목록 조회 실패', workspacesError);
      handleError(workspacesError, {
        customMessage: '워크스페이스 목록을 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [workspacesError, handleError]);

  // React Query 데이터를 로컬 변수로 동기화
  const workspaces = workspacesData || [];
  const error = workspacesError?.message || null;

  // fetchWorkspaces 함수는 기존 API와 호환성을 위해 유지 (refetch로 동작)
  const fetchWorkspaces = useCallback(async () => {
    await refetchWorkspaces();
  }, [refetchWorkspaces]);

  const createWorkspace = useCallback(async (workspaceData) => {
    try {
      const newWorkspace = await workspaceApi.createWorkspace(workspaceData);
      
      // React Query 캐시에 새 워크스페이스 추가
      queryClient.setQueryData(['workspaces'], (oldData) => {
        if (!oldData) return [newWorkspace];
        return [...oldData, newWorkspace];
      });
      
      return newWorkspace;
    } catch (err) {
      wlog.error('워크스페이스 생성 실패', err);
      handleError(err, {
        customMessage: '워크스페이스 생성에 실패했습니다.',
        showToast: true
      });
      throw err;
    }
  }, [queryClient, handleError]);

  const updateWorkspace = useCallback(async (id, workspaceData) => {
    try {
      const updatedWorkspace = await workspaceApi.updateWorkspace(id, workspaceData);
      
      // React Query 캐시 업데이트
      queryClient.setQueryData(['workspaces'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(workspace => 
          workspace.id === id ? updatedWorkspace : workspace
        );
      });
      
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(updatedWorkspace);
      }
    } catch (err) {
      wlog.error('워크스페이스 수정 실패', err);
      handleError(err, {
        customMessage: '워크스페이스 수정에 실패했습니다.',
        showToast: true
      });
      throw err;
    }
  }, [currentWorkspace, queryClient, handleError]);

  const deleteWorkspace = useCallback(async (id) => {
    try {
      await workspaceApi.softDeleteWorkspace(id);
      
      // React Query 캐시에서 워크스페이스 제거
      queryClient.setQueryData(['workspaces'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter(workspace => workspace.id !== id);
      });
      
      if (currentWorkspace?.id === id) {
        const remaining = workspaces.filter(w => w.id !== id);
        setCurrentWorkspace(remaining[0] || null);
      }
    } catch (err) {
      wlog.error('워크스페이스 삭제 실패', err);
      handleError(err, {
        customMessage: '워크스페이스 삭제에 실패했습니다.',
        showToast: true
      });
      throw err;
    }
  }, [currentWorkspace, workspaces, queryClient, handleError]);

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