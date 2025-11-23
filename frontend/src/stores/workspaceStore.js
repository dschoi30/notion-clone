import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { createLogger } from '@/lib/logger';

const wlog = createLogger('workspaceStore');

export const useWorkspaceStore = create(
  devtools(
    persist(
      (set, get) => ({
      // 클라이언트 상태
      currentWorkspace: null,
      isSettingsPanelOpen: false,
      isSearchModalOpen: false,

      /**
       * 현재 워크스페이스 선택
       * @param {Object} workspace - 선택할 워크스페이스 객체
       */
      selectWorkspace: (workspace) => {
        if (!workspace) {
          wlog.warn('selectWorkspace: workspace가 null입니다');
          return;
        }
        wlog.info(`🔄 워크스페이스 선택: ${workspace.id}(${workspace.name})`);
        set({ currentWorkspace: workspace });
        // localStorage는 persist 미들웨어가 자동으로 처리
      },

      /**
       * 설정 패널 열기/닫기
       * @param {boolean} isOpen - 패널 열림 상태
       */
      setSettingsPanelOpen: (isOpen) => {
        set({ isSettingsPanelOpen: isOpen });
      },

      /**
       * 검색 모달 열기/닫기
       * @param {boolean} isOpen - 모달 열림 상태
       */
      setSearchModalOpen: (isOpen) => {
        set({ isSearchModalOpen: isOpen });
      },

      /**
       * 현재 워크스페이스 정보 업데이트 (워크스페이스 수정 시 사용)
       * @param {Object} updatedWorkspace - 업데이트된 워크스페이스 객체
       */
      updateCurrentWorkspace: (updatedWorkspace) => {
        const current = get().currentWorkspace;
        if (current?.id === updatedWorkspace?.id) {
          set({ currentWorkspace: updatedWorkspace });
        }
      },

      /**
       * 현재 워크스페이스 초기화 (워크스페이스 삭제 시 사용)
       */
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
    ),
    { name: 'WorkspaceStore' }
  )
);

