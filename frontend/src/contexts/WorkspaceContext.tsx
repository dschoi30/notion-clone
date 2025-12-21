import { createContext, useContext, useCallback, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useShallow } from 'zustand/react/shallow';
import * as workspaceApi from '@/services/workspaceApi';
import { createLogger } from '@/lib/logger';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import type { Workspace } from '@/types';
import type { CreateWorkspaceRequest } from '@/services/workspaceApi';

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
  isSettingsPanelOpen: boolean;
  setIsSettingsPanelOpen: (open: boolean) => void;
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (workspaceData: CreateWorkspaceRequest) => Promise<Workspace>;
  updateWorkspace: (id: number, workspaceData: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: number) => Promise<void>;
  selectWorkspace: (workspace: Workspace) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);
const wlog = createLogger('WorkspaceContext');

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  // zustand store에서 클라이언트 상태 가져오기 (useShallow로 최적화)
  const {
    currentWorkspace,
    isSettingsPanelOpen,
    isSearchModalOpen,
    selectWorkspace: selectWorkspaceStore,
    setSettingsPanelOpen,
    setSearchModalOpen,
    updateCurrentWorkspace,
    clearCurrentWorkspace
  } = useWorkspaceStore(
    useShallow((state) => ({
      currentWorkspace: state.currentWorkspace,
      isSettingsPanelOpen: state.isSettingsPanelOpen,
      isSearchModalOpen: state.isSearchModalOpen,
      selectWorkspace: state.selectWorkspace,
      setSettingsPanelOpen: state.setSettingsPanelOpen,
      setSearchModalOpen: state.setSearchModalOpen,
      updateCurrentWorkspace: state.updateCurrentWorkspace,
      clearCurrentWorkspace: state.clearCurrentWorkspace
    }))
  );

  // React Query로 워크스페이스 목록 조회
  const {
    data: workspacesData,
    isLoading: loading,
    error: workspacesError,
    refetch: refetchWorkspaces,
  } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      wlog.info(`fetchWorkspaces 시작`);
      const data = await workspaceApi.getAccessibleWorkspaces();
      const filtered = Array.isArray(data) ? data.filter(ws => !ws.isTrashed) : [];
      wlog.info(`워크스페이스 목록 로드:`, filtered.map(ws => `${ws.id}(${ws.name})`).join(', '));
      wlog.info(`fetchWorkspaces 완료: ${filtered.length}개 워크스페이스`);
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
  const error = workspacesError instanceof Error ? workspacesError.message : (workspacesError ? String(workspacesError) : null);

  // workspaces 목록이 로드되면 자동으로 currentWorkspace 설정
  useEffect(() => {
    const savedId = localStorage.getItem('selectedWorkspace');
    wlog.info(`WorkspaceContext - savedId: ${savedId}, workspaces.length: ${workspaces.length}`);
    wlog.info(`현재 workspaces:`, workspaces.map(ws => `${ws.id}(${ws.name})`).join(', '));
    
    if (workspaces.length > 0 && !currentWorkspace) {
      if (savedId) {
        const found = workspaces.find(ws => String(ws.id) === String(savedId));
        wlog.info(`savedId ${savedId}로 찾은 워크스페이스:`, found ? `${found.id}(${found.name})` : 'null');
        
        if (found) {
          wlog.info(`워크스페이스 설정: ${found.id}(${found.name})`);
          selectWorkspaceStore(found);
        } else {
          wlog.info(`저장된 워크스페이스 못 찾음. 첫 번째 워크스페이스 사용: ${workspaces[0].id}(${workspaces[0].name})`);
          selectWorkspaceStore(workspaces[0]);
        }
      } else {
        wlog.info(`저장된 워크스페이스 없음. 첫 번째 워크스페이스 사용: ${workspaces[0].id}(${workspaces[0].name})`);
        selectWorkspaceStore(workspaces[0]);
      }
    }
  }, [workspaces, currentWorkspace, selectWorkspaceStore]);

  // fetchWorkspaces 함수는 기존 API와 호환성을 위해 유지 (refetch로 동작)
  const fetchWorkspaces = useCallback(async () => {
    await refetchWorkspaces();
  }, [refetchWorkspaces]);

  const createWorkspace = useCallback(async (workspaceData: CreateWorkspaceRequest) => {
    try {
      const newWorkspace = await workspaceApi.createWorkspace(workspaceData);
      
      // React Query 캐시에 새 워크스페이스 추가
      queryClient.setQueryData<Workspace[]>(['workspaces'], (oldData) => {
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

  const updateWorkspace = useCallback(async (id: number, workspaceData: Partial<Workspace>) => {
    try {
      const updatedWorkspace = await workspaceApi.updateWorkspace(id, workspaceData);
      
      // React Query 캐시 업데이트
      queryClient.setQueryData<Workspace[]>(['workspaces'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(workspace => 
          workspace.id === id ? updatedWorkspace : workspace
        );
      });
      
      // 현재 워크스페이스가 업데이트된 경우 zustand store도 업데이트
      if (currentWorkspace?.id === id) {
        updateCurrentWorkspace(updatedWorkspace);
      }
    } catch (err) {
      wlog.error('워크스페이스 수정 실패', err);
      handleError(err, {
        customMessage: '워크스페이스 수정에 실패했습니다.',
        showToast: true
      });
      throw err;
    }
  }, [currentWorkspace, queryClient, handleError, updateCurrentWorkspace]);

  const deleteWorkspace = useCallback(async (id: number) => {
    try {
      await workspaceApi.softDeleteWorkspace(id);
      
      // React Query 캐시에서 워크스페이스 제거
      queryClient.setQueryData<Workspace[]>(['workspaces'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter(workspace => workspace.id !== id);
      });
      
      // 현재 워크스페이스가 삭제된 경우 다른 워크스페이스로 변경
      if (currentWorkspace?.id === id) {
        const remaining = workspaces.filter(w => w.id !== id);
        if (remaining.length > 0) {
          selectWorkspaceStore(remaining[0]);
        } else {
          clearCurrentWorkspace();
        }
      }
    } catch (err) {
      wlog.error('워크스페이스 삭제 실패', err);
      handleError(err, {
        customMessage: '워크스페이스 삭제에 실패했습니다.',
        showToast: true
      });
      throw err;
    }
  }, [currentWorkspace, workspaces, queryClient, handleError, selectWorkspaceStore, clearCurrentWorkspace]);

  // 기존 API와 호환성을 위한 selectWorkspace 래퍼
  const selectWorkspace = useCallback((workspace: Workspace) => {
    selectWorkspaceStore(workspace);
    // localStorage는 persist 미들웨어가 자동으로 처리하지만, 
    // 기존 코드와의 호환성을 위해 명시적으로 저장
    if (workspace?.id) {
      localStorage.setItem('selectedWorkspace', String(workspace.id));
      wlog.info(`localStorage 저장: selectedWorkspace = ${workspace.id}`);
    }
  }, [selectWorkspaceStore]);

  const value: WorkspaceContextType = {
    workspaces,
    currentWorkspace,
    loading,
    error,
    isSettingsPanelOpen,
    setIsSettingsPanelOpen: setSettingsPanelOpen,
    isSearchModalOpen,
    setIsSearchModalOpen: setSearchModalOpen,
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

