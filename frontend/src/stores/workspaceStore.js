import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createLogger } from '@/lib/logger';

const wlog = createLogger('workspaceStore');

export const useWorkspaceStore = create(
  persist(
    (set, get) => ({
      // 클라이언트 상태
      currentWorkspace: null,
      isSettingsPanelOpen: false,
      isSearchModalOpen: false,

      // 액션: 워크스페이스 선택
      selectWorkspace: (workspace) => {
        if (!workspace) {
          wlog.warn('selectWorkspace: workspace가 null입니다');
          return;
        }
        wlog.info(`🔄 워크스페이스 선택: ${workspace.id}(${workspace.name})`);
        set({ currentWorkspace: workspace });
        // localStorage는 persist 미들웨어가 자동으로 처리
      },

      // 액션: 설정 패널 열기/닫기
      setSettingsPanelOpen: (isOpen) => {
        set({ isSettingsPanelOpen: isOpen });
      },

      // 액션: 검색 모달 열기/닫기
      setSearchModalOpen: (isOpen) => {
        set({ isSearchModalOpen: isOpen });
      },

      // 액션: 현재 워크스페이스 업데이트 (워크스페이스 수정 시 사용)
      updateCurrentWorkspace: (updatedWorkspace) => {
        const current = get().currentWorkspace;
        if (current?.id === updatedWorkspace?.id) {
          set({ currentWorkspace: updatedWorkspace });
        }
      },

      // 액션: 현재 워크스페이스 초기화 (워크스페이스 삭제 시 사용)
      clearCurrentWorkspace: () => {
        set({ currentWorkspace: null });
      },
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({ 
        currentWorkspace: state.currentWorkspace 
      }), // currentWorkspace만 persist
    }
  )
);

