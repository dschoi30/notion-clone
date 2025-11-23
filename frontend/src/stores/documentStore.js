import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createLogger } from '@/lib/logger';

const rlog = createLogger('documentStore');

export const useDocumentStore = create(
  persist(
    (set, get) => ({
      // 클라이언트 상태
      currentDocument: null,
      documentLoading: false,

      // 액션: 현재 문서 설정
      setCurrentDocument: (document) => {
        set({ currentDocument: document });
        // localStorage는 persist 미들웨어가 자동으로 처리
        if (document?.id) {
          const workspaceId = document.workspaceId;
          if (workspaceId) {
            localStorage.setItem(`lastDocumentId:${workspaceId}`, document.id);
          }
        }
      },

      // 액션: 문서 로딩 상태 설정
      setDocumentLoading: (loading) => {
        set({ documentLoading: loading });
      },

      // 액션: 현재 문서 업데이트 (문서 수정 시 사용)
      updateCurrentDocument: (updatedDocument) => {
        const current = get().currentDocument;
        if (current?.id === updatedDocument?.id) {
          // 기존 currentDocument의 모든 필드를 보존하고, 업데이트된 필드만 덮어쓰기
          // updatedDocument의 모든 필드를 우선적으로 적용 (isLocked 등 즉시 반영을 위해)
          const mergedUpdated = {
            ...current,
            ...updatedDocument,
            permissions: (Array.isArray(updatedDocument?.permissions) && updatedDocument.permissions.length > 0)
              ? updatedDocument.permissions
              : (current.permissions || []),
          };
          // 새로운 객체를 생성하여 참조 변경을 보장 (React 리렌더링 트리거)
          set({ currentDocument: { ...mergedUpdated } });
        }
      },

      // 액션: 현재 문서 초기화 (워크스페이스 변경 시 사용)
      clearCurrentDocument: () => {
        set({ currentDocument: null });
      },

      // 액션: 문서 삭제 시 처리 (다른 문서로 전환)
      handleDocumentDeletion: (deletedId, remainingDocuments) => {
        const current = get().currentDocument;
        if (current?.id === deletedId) {
          const nextDocument = remainingDocuments.length > 0 ? remainingDocuments[0] : null;
          set({ currentDocument: nextDocument });
        }
      },
    }),
    {
      name: 'document-storage',
      partialize: (state) => ({ 
        currentDocument: state.currentDocument 
      }), // currentDocument만 persist
    }
  )
);

