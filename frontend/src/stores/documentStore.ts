import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { createLogger } from '@/lib/logger';
import type { Document } from '@/types';

const dlog = createLogger('documentStore');

interface DocumentState {
  // 클라이언트 상태
  currentDocument: Document | null;
  documentLoading: boolean;
}

interface DocumentActions {
  /**
   * 현재 문서 설정
   * @param document - 설정할 문서 객체 (null이면 초기화)
   */
  setCurrentDocument: (document: Document | null) => void;

  /**
   * 문서 로딩 상태 설정
   * @param loading - 로딩 상태
   */
  setDocumentLoading: (loading: boolean) => void;

  /**
   * 현재 문서 업데이트 (문서 수정 시 사용)
   * 기존 필드를 보존하고 업데이트된 필드만 덮어쓰기
   * @param updatedDocument - 업데이트할 문서 데이터
   */
  updateCurrentDocument: (updatedDocument: Partial<Document>) => void;

  /**
   * 현재 문서 초기화 (워크스페이스 변경 시 사용)
   */
  clearCurrentDocument: () => void;

  /**
   * 문서 삭제 시 처리 (다른 문서로 전환)
   * @param deletedId - 삭제된 문서 ID
   * @param remainingDocuments - 남은 문서 목록
   */
  handleDocumentDeletion: (deletedId: number, remainingDocuments: Document[]) => void;
}

type DocumentStore = DocumentState & DocumentActions;

export const useDocumentStore = create<DocumentStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 클라이언트 상태
        currentDocument: null,
        documentLoading: false,

        /**
         * 현재 문서 설정
         * @param document - 설정할 문서 객체 (null이면 초기화)
         */
        setCurrentDocument: (document: Document | null): void => {
          set({ currentDocument: document });
          // persist 미들웨어가 자동으로 localStorage에 저장
          // lastDocumentId는 DocumentContext의 selectDocument에서 별도로 관리 (워크스페이스별 저장 필요)
        },

        /**
         * 문서 로딩 상태 설정
         * @param loading - 로딩 상태
         */
        setDocumentLoading: (loading: boolean): void => {
          set({ documentLoading: loading });
        },

        /**
         * 현재 문서 업데이트 (문서 수정 시 사용)
         * 기존 필드를 보존하고 업데이트된 필드만 덮어쓰기
         * @param updatedDocument - 업데이트할 문서 데이터
         */
        updateCurrentDocument: (updatedDocument: Partial<Document>): void => {
          const current = get().currentDocument;
          if (current?.id === updatedDocument?.id) {
            // 기존 currentDocument의 모든 필드를 보존하고, 업데이트된 필드만 덮어쓰기
            // updatedDocument의 모든 필드를 우선적으로 적용 (isLocked 등 즉시 반영을 위해)
            const mergedUpdated: Document = {
              ...current,
              ...updatedDocument,
              id: current.id,
              workspaceId: current.workspaceId,
              userId: current.userId,
              createdAt: current.createdAt,
              updatedAt: current.updatedAt,
              permissions: (Array.isArray(updatedDocument?.permissions) && updatedDocument.permissions.length > 0)
                ? updatedDocument.permissions
                : (current.permissions || []),
            } as Document;
            // 새로운 객체를 생성하여 참조 변경을 보장 (React 리렌더링 트리거)
            set({ currentDocument: mergedUpdated });
          }
        },

        /**
         * 현재 문서 초기화 (워크스페이스 변경 시 사용)
         */
        clearCurrentDocument: (): void => {
          set({ currentDocument: null });
        },

        /**
         * 문서 삭제 시 처리 (다른 문서로 전환)
         * @param deletedId - 삭제된 문서 ID
         * @param remainingDocuments - 남은 문서 목록
         */
        handleDocumentDeletion: (deletedId: number, remainingDocuments: Document[]): void => {
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
    ),
    { name: 'DocumentStore' }
  )
);

