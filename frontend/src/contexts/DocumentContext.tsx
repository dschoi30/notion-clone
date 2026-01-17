// src/contexts/DocumentContext.tsx
import { createContext, useContext, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDocumentStore } from '@/stores/documentStore';
import { useShallow } from 'zustand/react/shallow';
import * as documentApi from '@/services/documentApi';
import { createLogger } from '@/lib/logger';
import { useWorkspace } from './WorkspaceContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useAuth } from './AuthContext';
import type { Document } from '@/types';
import type { CreateDocumentRequest } from '@/services/documentApi';

interface Pagination {
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
}

interface DocumentsData {
  documents: Document[];
  pagination: Pagination;
}

interface DocumentContextType {
  documents: Document[];
  currentDocument: Document | null;
  error: string | null;
  pagination: Pagination;
  fetchDocuments: (page?: number | null, size?: number | null) => Promise<void>;
  fetchChildDocuments: (parentId: number, options?: {}) => Promise<Document[]>;
  createDocument: (documentData: CreateDocumentRequest, options?: {}) => Promise<Document | undefined>;
  updateDocument: (id: number, documentData: Partial<Document>) => Promise<Document | undefined>;
  deleteDocument: (id: number) => Promise<void>;
  selectDocument: (document: Document, options?: { source?: string }) => Promise<void>;
  updateDocumentOrder: (documentIds: number[]) => Promise<void>;
  fetchDocument: (documentId: number, options?: { silent?: boolean; apply?: boolean }) => Promise<Document | undefined>;
  refreshAllChildDocuments: () => Promise<void>;
  documentsLoading: boolean;
  documentLoading: boolean;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

/**
 * 문서 업데이트 데이터 병합 함수
 * 명확한 우선순위로 문서 데이터를 병합합니다.
 * 
 * 우선순위:
 * 1. documentData (클라이언트 업데이트, isLocked 등 즉시 반영 필요)
 * 2. updated (서버 응답)
 * 3. currentDocument (기존 문서 데이터)
 * 
 * @param currentDocument - 현재 문서 데이터
 * @param serverResponse - 서버 응답 데이터
 * @param clientUpdate - 클라이언트 업데이트 데이터
 * @returns 병합된 문서 데이터
 * 
 * Note: Fast refresh 경고는 무시 가능 (실제 기능에 영향 없음)
 */
// eslint-disable-next-line react-refresh/only-export-components
const mergeDocumentUpdate = (
  currentDocument: Document | null,
  serverResponse: Partial<Document>,
  clientUpdate: Partial<Document>
): Document => {
  // Base: 현재 문서
  const base = currentDocument || ({} as Document);

  // 1단계: 서버 응답 적용
  const withServerData = { ...base, ...serverResponse };

  // 2단계: 클라이언트 업데이트 적용 (isLocked 등 우선순위 높음)
  const withClientData = { ...withServerData, ...clientUpdate };

  // 3단계: permissions는 서버 데이터 우선 (서버 데이터가 있으면 사용, 없으면 기존 데이터 유지)
  return {
    ...withClientData,
    permissions: (Array.isArray(serverResponse?.permissions) && serverResponse.permissions.length > 0)
      ? serverResponse.permissions
      : (base.permissions || []),
  } as Document;
};

export function useDocument(): DocumentContextType {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
}

interface DocumentProviderProps {
  children: ReactNode;
}

interface SelectDocumentOptions {
  source?: string;
}

interface FetchDocumentOptions {
  silent?: boolean;
  apply?: boolean;
}

export function DocumentProvider({ children }: DocumentProviderProps) {
  const rlog = createLogger('router');
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { handleError } = useErrorHandler();
  const lastSelectRef = useRef<{ id: number | null; at: number }>({ id: null, at: 0 });

  // zustand store에서 클라이언트 상태 가져오기 (useShallow로 최적화)
  const {
    currentDocument,
    documentLoading,
    setCurrentDocument,
    setDocumentLoading,
    updateCurrentDocument,
    clearCurrentDocument,
    handleDocumentDeletion
  } = useDocumentStore(
    useShallow((state) => ({
      currentDocument: state.currentDocument,
      documentLoading: state.documentLoading,
      setCurrentDocument: state.setCurrentDocument,
      setDocumentLoading: state.setDocumentLoading,
      updateCurrentDocument: state.updateCurrentDocument,
      clearCurrentDocument: state.clearCurrentDocument,
      handleDocumentDeletion: state.handleDocumentDeletion
    }))
  );

  // React Query로 문서 목록 조회
  const {
    data: documentsData,
    isLoading: documentsLoading,
    error: documentsError,
    refetch: refetchDocuments,
  } = useQuery<DocumentsData>({
    queryKey: ['documents', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null as unknown as DocumentsData;

      // 전체 목록 조회 (페이지네이션 없음)
      const data = await documentApi.getDocumentList(currentWorkspace.id);

      // 백엔드 응답이 배열인지 Page 객체인지 확인
      // 페이지네이션 파라미터가 없으면 배열을 반환하고, 있으면 Page 객체를 반환
      const documents = Array.isArray(data) ? data : (data.content || []);

      // 백엔드에서 다른 워크스페이스 문서가 섞여서 올 경우를 대비한 필터링
      const currentWorkspaceId = String(currentWorkspace.id);
      const filteredData = documents.filter(doc => {
        const docWorkspaceId = doc.workspaceId || (doc as any).workspace?.id;
        return !docWorkspaceId || String(docWorkspaceId) === currentWorkspaceId;
      });

      return {
        documents: filteredData,
        pagination: {
          page: Array.isArray(data) ? 0 : (data.number || 0),
          size: Array.isArray(data) ? filteredData.length : (data.size || filteredData.length),
          totalPages: Array.isArray(data) ? 1 : (data.totalPages || 1),
          totalElements: Array.isArray(data) ? filteredData.length : (data.totalElements || filteredData.length),
          hasNext: Array.isArray(data) ? false : (!data.last),
        },
      };
    },
    enabled: !!currentWorkspace,
    staleTime: 1000 * 60 * 2, // 2분 - 문서 목록은 자주 변경되므로 짧게 설정
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (documentsError) {
      rlog.error('문서 목록 조회 실패', documentsError);
      handleError(documentsError, {
        customMessage: '문서 목록을 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [documentsError, handleError]);

  // React Query 데이터를 로컬 상태로 동기화
  const documents = documentsData?.documents || [];
  const pagination = documentsData?.pagination || {
    page: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
    hasNext: false,
  };
  const error = documentsError instanceof Error ? documentsError.message : (documentsError ? String(documentsError) : null);

  // currentWorkspace 변경 시 즉시 상태 초기화 및 최근 문서 로드
  const prevWorkspaceIdRef = useRef<number | null>(null);
  const autoSelectRef = useRef<boolean>(false);
  const selectDocumentRef = useRef<((document: Document, options?: SelectDocumentOptions) => Promise<void>) | null>(null);

  useEffect(() => {
    const currentWorkspaceId = currentWorkspace?.id;
    const prevWorkspaceId = prevWorkspaceIdRef.current;

    // 워크스페이스가 변경된 경우
    if (currentWorkspaceId && prevWorkspaceId !== currentWorkspaceId) {
      // 즉시 모든 상태 초기화 (이전 워크스페이스 데이터 제거)
      clearCurrentDocument();
      // React Query 캐시도 무효화
      queryClient.invalidateQueries({ queryKey: ['documents', currentWorkspaceId] });
      // 자동 선택 플래그 리셋
      autoSelectRef.current = false;
      prevWorkspaceIdRef.current = currentWorkspaceId;
    }
  }, [currentWorkspace, queryClient, clearCurrentDocument]);

  // 워크스페이스 변경 후 문서 목록이 로드되면 최근 문서 자동 선택
  useEffect(() => {
    if (!currentWorkspace || documents.length === 0 || currentDocument || documentLoading) {
      // 문서가 로드 중이거나 이미 선택된 문서가 있으면 스킵
      if (currentDocument) {
        autoSelectRef.current = false; // 리셋
      }
      return;
    }

    // selectDocument가 아직 정의되지 않았으면 스킵
    if (!selectDocumentRef.current) return;

    // 이미 자동 선택이 진행 중이면 스킵
    if (autoSelectRef.current) return;

    autoSelectRef.current = true;

    // 로컬 스토리지에서 해당 사용자 및 워크스페이스의 최근 문서 ID 조회
    const storageKey = user?.id ? `lastDocumentId:${user.id}:${currentWorkspace.id}` : null;
    const lastDocumentId = storageKey ? localStorage.getItem(storageKey) : null;
    if (!lastDocumentId) {
      // 최근 문서가 없으면 첫 번째 문서 선택
      if (documents[0]) {
        rlog.info('워크스페이스 변경: 첫 번째 문서 자동 선택', {
          workspaceId: currentWorkspace.id,
          documentId: documents[0].id
        });
        selectDocumentRef.current(documents[0], { source: 'workspaceChange' }).catch(() => {
          autoSelectRef.current = false; // 실패 시 리셋
        });
      }
      return;
    }

    // 최근 문서 찾기
    const lastDoc = documents.find(doc => String(doc.id) === String(lastDocumentId));
    if (lastDoc) {
      rlog.info('워크스페이스 변경: 최근 문서 자동 선택', {
        workspaceId: currentWorkspace.id,
        documentId: lastDoc.id
      });
      selectDocumentRef.current(lastDoc, { source: 'workspaceChange' }).catch(() => {
        autoSelectRef.current = false; // 실패 시 리셋
      });
    } else {
      // 최근 문서가 목록에 없으면 첫 번째 문서 선택
      if (documents[0]) {
        rlog.info('워크스페이스 변경: 최근 문서 없음, 첫 번째 문서 선택', {
          workspaceId: currentWorkspace.id,
          documentId: documents[0].id
        });
        selectDocumentRef.current(documents[0], { source: 'workspaceChange' }).catch(() => {
          autoSelectRef.current = false; // 실패 시 리셋
        });
      }
      // 유효하지 않은 최근 문서 ID 제거
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    }
  }, [currentWorkspace, documents, currentDocument, documentLoading, user]);

  // fetchDocuments 함수는 기존 API와 호환성을 위해 유지 (refetch로 동작)
  const fetchDocuments = useCallback(async (page: number | null = null, size: number | null = null) => {
    if (!currentWorkspace) return;

    // 페이지네이션 파라미터가 있으면 별도 처리 (추후 개선 가능)
    if (page !== null && size !== null) {
      try {
        const response = await documentApi.getDocumentList(currentWorkspace.id, page, size);

        // 페이지네이션 파라미터가 있으면 항상 PaginatedResponse를 반환해야 함
        if (Array.isArray(response)) {
          throw new Error('페이지네이션 파라미터가 있는데 배열이 반환되었습니다.');
        }

        // 백엔드에서 다른 워크스페이스 문서가 섞여서 올 경우를 대비한 필터링
        const currentWorkspaceId = String(currentWorkspace.id);
        const filteredData = response.content.filter(doc => {
          const docWorkspaceId = doc.workspaceId || (doc as any).workspace?.id;
          return !docWorkspaceId || String(docWorkspaceId) === currentWorkspaceId;
        });

        // React Query 캐시 업데이트
        queryClient.setQueryData<DocumentsData>(['documents', currentWorkspace.id], {
          documents: filteredData,
          pagination: {
            page: response.number,
            size: response.size,
            totalPages: response.totalPages,
            totalElements: response.totalElements,
            hasNext: !response.last,
          },
        });
      } catch (err) {
        rlog.error('문서 목록 조회 실패 (페이지네이션)', err);
        handleError(err, {
          customMessage: '문서 목록을 불러오지 못했습니다.',
          showToast: true
        });
        throw err;
      }
    } else {
      // 전체 목록 조회는 React Query refetch 사용
      await refetchDocuments();
    }
  }, [currentWorkspace, queryClient, refetchDocuments, handleError]);

  const createDocument = useCallback(async (documentData: CreateDocumentRequest, options = {}) => {
    if (!currentWorkspace) return;

    try {
      const newDocument = await documentApi.createDocument(currentWorkspace.id, documentData);

      // React Query 캐시에 새 문서 추가
      queryClient.setQueryData<DocumentsData>(['documents', currentWorkspace.id], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          documents: [...oldData.documents, newDocument],
          pagination: {
            ...oldData.pagination,
            totalElements: oldData.pagination.totalElements + 1,
            size: oldData.documents.length + 1,
          },
        };
      });

      return newDocument;
    } catch (err) {
      rlog.error('문서 생성 실패', err);
      handleError(err, {
        customMessage: '문서 생성에 실패했습니다.',
        showToast: true
      });
      throw err;
    }
  }, [currentWorkspace, queryClient, handleError]);

  const updateDocument = useCallback(async (id: number, documentData: Partial<Document>) => {
    if (!currentWorkspace) return;

    try {
      const updated = await documentApi.updateDocument(currentWorkspace.id, id, documentData);

      // 명확한 우선순위로 문서 데이터 병합
      // 우선순위: documentData (클라이언트) > updated (서버) > currentDocument (기존)
      const mergedUpdated = currentDocument?.id === id
        ? mergeDocumentUpdate(currentDocument, updated, documentData)
        : { ...updated, ...documentData } as Document;

      // React Query 캐시 업데이트
      queryClient.setQueryData<DocumentsData>(['documents', currentWorkspace.id], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          documents: oldData.documents.map(doc => (doc.id === id ? { ...doc, ...mergedUpdated } : doc)),
        };
      });

      // 현재 문서가 업데이트된 경우 zustand store도 업데이트
      if (currentDocument?.id === id) {
        updateCurrentDocument(mergedUpdated);
      }

      return mergedUpdated;
    } catch (err) {
      rlog.error('문서 수정 실패', err);

      // 403 에러인 경우 더 구체적인 메시지 제공
      let customMessage = '문서 수정에 실패했습니다.';
      const apiError = err as { response?: { status?: number } };
      if (apiError.response?.status === 403) {
        customMessage = '이 문서를 수정할 권한이 없습니다.';
      }

      handleError(err, {
        customMessage,
        showToast: true
      });
      throw err;
    }
  }, [currentWorkspace, currentDocument, queryClient, handleError, updateCurrentDocument]);

  const deleteDocument = useCallback(async (id: number) => {
    if (!currentWorkspace) return;

    try {
      await documentApi.deleteDocument(currentWorkspace.id, id);

      // React Query 캐시에서 문서 제거
      queryClient.setQueryData<DocumentsData>(['documents', currentWorkspace.id], (oldData) => {
        if (!oldData) return oldData;
        const filtered = oldData.documents.filter(doc => doc.id !== id);
        return {
          ...oldData,
          documents: filtered,
          pagination: {
            ...oldData.pagination,
            totalElements: oldData.pagination.totalElements - 1,
            size: filtered.length,
          },
        };
      });

      // 현재 문서가 삭제된 경우 다른 문서로 전환
      if (currentDocument?.id === id) {
        const remainingDocs = documents.filter(d => d.id !== id);
        handleDocumentDeletion(id, remainingDocs);
      }
    } catch (err) {
      rlog.error('문서 삭제 실패', err);
      handleError(err, {
        customMessage: '문서 삭제에 실패했습니다.',
        showToast: true
      });
      throw err;
    }
  }, [currentWorkspace, currentDocument, documents, queryClient, handleError, handleDocumentDeletion]);

  const selectDocument = useCallback(async (document: Document, options: SelectDocumentOptions = {}) => {
    if (!currentWorkspace || !document) return;
    if (documentLoading && currentDocument?.id === document.id) {
      rlog.debug('selectDocument skip (in-flight same id)', { id: document.id, src: options.source });
      return;
    }
    if (currentDocument?.id === document.id) {
      rlog.debug('selectDocument skip (already current)', { id: document.id, src: options.source });
      return;
    }
    // 중복 호출 스로틀 (2s)
    const now = Date.now();
    if (lastSelectRef.current.id === document.id && now - lastSelectRef.current.at < 2000) {
      rlog.warn('selectDocument throttled', { id: document.id, src: options.source });
      return;
    }
    // URL id와 불일치 시 방어 (자동 호출에서만 적용)
    // 사용자 액션(sidebar, path 클릭 등)에서는 URL 업데이트가 뒤따르므로 차단하지 않음
    const isAutoSource = options.source === 'idSlugEffect' || options.source === 'workspaceChange';
    if (isAutoSource) {
      try {
        const urlDocId = window.location.pathname.match(/^\/(\d+)(?:-.+)?$/)?.[1];
        if (urlDocId && String(urlDocId) !== String(document.id)) {
          rlog.debug('selectDocument blocked by URL guard (auto)', { target: document.id, urlDocId, src: options.source });
          return;
        }
      } catch { }
    }

    // 문서 객체에 워크스페이스 ID가 있으면 미리 검증
    if (document.workspaceId && String(document.workspaceId) !== String(currentWorkspace.id)) {
      rlog.warn('selectDocument blocked: 문서가 다른 워크스페이스에 속함', {
        documentId: document.id,
        documentWorkspaceId: document.workspaceId,
        currentWorkspaceId: currentWorkspace.id,
        src: options.source,
      });
      // 조용히 실패 (에러를 던지지 않음)
      return;
    }

    // 문서 객체에 workspaceId가 없으면 문서 목록에서 확인
    if (!document.workspaceId) {
      const foundInList = documents.find(doc => String(doc.id) === String(document.id));
      if (foundInList) {
        // 문서 목록에 있으면 해당 문서의 workspaceId로 검증
        if (foundInList.workspaceId && String(foundInList.workspaceId) !== String(currentWorkspace.id)) {
          rlog.warn('selectDocument blocked: 문서 목록에서 확인한 결과 다른 워크스페이스에 속함', {
            documentId: document.id,
            documentWorkspaceId: foundInList.workspaceId,
            currentWorkspaceId: currentWorkspace.id,
            src: options.source,
          });
          return;
        }
      }
      // 문서 목록에 없으면 API 호출 후 검증 (자식 문서 등 접근 가능한 경우)
    }

    try {
      setDocumentLoading(true);
      rlog.info('selectDocument', { id: document.id, ws: currentWorkspace?.id, src: options.source });
      const fullDocument = await documentApi.getDocument(currentWorkspace.id, document.id);

      // 조회된 문서가 현재 워크스페이스에 속하는지 검증
      if (fullDocument.workspaceId && String(fullDocument.workspaceId) !== String(currentWorkspace.id)) {
        rlog.warn('문서가 다른 워크스페이스에 속함 (API 조회 후 확인)', {
          documentId: document.id,
          documentWorkspaceId: fullDocument.workspaceId,
          currentWorkspaceId: currentWorkspace.id,
          src: options.source,
        });
        // 조용히 실패 (에러를 던지지 않음) - DocumentEditor에서 이미 처리함
        return;
      }

      setCurrentDocument(fullDocument);
      lastSelectRef.current = { id: document.id, at: Date.now() };

      // 사용자별 마지막 문서 ID 저장 (lastDocumentId:${userId}:${workspaceId})
      if (user?.id && currentWorkspace?.id) {
        const storageKey = `lastDocumentId:${user.id}:${currentWorkspace.id}`;
        const prevValue = localStorage.getItem(storageKey);
        if (prevValue !== String(document.id)) {
          localStorage.setItem(storageKey, String(document.id));
          rlog.debug('마지막 문서 저장', { userId: user.id, workspaceId: currentWorkspace.id, documentId: document.id });
        }
      }
    } catch (err) {
      rlog.error('문서 선택 실패', err, { documentId: document.id });
      // 워크스페이스 불일치 에러는 조용히 처리 (이미 DocumentEditor에서 리다이렉트 처리)
      const error = err as Error;
      if (error.message && error.message.includes('워크스페이스에 속하지 않습니다')) {
        rlog.warn('selectDocument: 워크스페이스 불일치로 인한 조용한 실패', { documentId: document.id });
        return;
      }
      handleError(err, {
        customMessage: '문서를 불러오지 못했습니다.',
        showToast: true
      });
      // 에러 발생 시 현재 문서를 유지 (예기치 않은 문서 전환 방지)
      throw err;
    } finally {
      setDocumentLoading(false);
    }
  }, [currentWorkspace, currentDocument, documentLoading, documents, handleError, setCurrentDocument, setDocumentLoading, user]);

  // selectDocument를 ref에 저장하여 useEffect에서 사용 가능하도록 함
  useEffect(() => {
    selectDocumentRef.current = selectDocument;
  }, [selectDocument]);

  const updateDocumentOrder = useCallback(async (documentIds: number[]) => {
    if (!currentWorkspace) return;
    try {
      await documentApi.updateDocumentOrder(currentWorkspace.id, documentIds);

      // React Query 캐시 업데이트 - sortOrder 업데이트
      queryClient.setQueryData<DocumentsData>(['documents', currentWorkspace.id], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          documents: oldData.documents.map(doc => {
            const newIndex = documentIds.indexOf(doc.id);
            if (newIndex !== -1) {
              return { ...doc, sortOrder: newIndex };
            }
            return doc;
          }),
        };
      });
    } catch (err) {
      rlog.error('문서 순서 업데이트 실패', err);
      handleError(err, {
        customMessage: '문서 순서 업데이트에 실패했습니다.',
        showToast: true
      });
      throw err;
    }
  }, [currentWorkspace, queryClient, handleError]);

  // 단일 문서 정보 갱신용 fetchDocument 함수 (silent 옵션 지원)
  const fetchDocument = useCallback(async (documentId: number, options: FetchDocumentOptions = {}) => {
    if (!currentWorkspace || !documentId) return;
    const isSilent = options && options.silent === true;
    const apply = options && options.apply !== false; // default true
    try {
      if (!isSilent) setDocumentLoading(true);
      const fullDocument = await documentApi.getDocument(currentWorkspace.id, documentId);
      rlog.info('fetchDocument', { id: documentId, silent: isSilent, apply });
      if (apply) setCurrentDocument(fullDocument);
      return fullDocument;
    } catch (err) {
      rlog.error('Failed to fetch document', err, { documentId });
      throw err;
    } finally {
      if (!isSilent) setDocumentLoading(false);
    }
  }, [currentWorkspace, setCurrentDocument, setDocumentLoading]);

  // parentId 기반 하위 문서(서브페이지) 목록 조회
  const fetchChildDocuments = useCallback(async (parentId: number, options = {}) => {
    if (!currentWorkspace) return [];
    try {
      const data = await documentApi.getChildDocuments(currentWorkspace.id, parentId);
      return data;
    } catch (err) {
      // 403 에러는 API 인터셉터에서 처리하므로 여기서는 조용히 종료
      const apiError = err as { response?: { status?: number } };
      if (apiError.response?.status === 403) {
        rlog.warn('403 Forbidden - API 인터셉터에서 처리됨', { parentId });
        return []; // 에러 상태 설정하지 않고 조용히 종료
      }

      rlog.error('fetchChildDocuments 에러', err, { parentId });
      return [];
    }
  }, [currentWorkspace]);

  // 모든 자식 문서들을 새로고침하는 함수 (버전 복원 시 사용)
  const refreshAllChildDocuments = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      // React Query 캐시 무효화하여 자동 리페칭
      await queryClient.invalidateQueries({ queryKey: ['documents', currentWorkspace.id] });
    } catch (err) {
      rlog.error('Failed to refresh child documents', err);
      throw err;
    }
  }, [currentWorkspace, queryClient]);

  // Context value 메모이제이션으로 불필요한 리렌더링 방지
  const value = useMemo<DocumentContextType>(() => ({
    documents,
    currentDocument,
    error,
    pagination,
    fetchDocuments,
    fetchChildDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    selectDocument,
    updateDocumentOrder,
    fetchDocument,
    refreshAllChildDocuments,
    documentsLoading,
    documentLoading,
  }), [
    documents,
    currentDocument,
    error,
    pagination,
    fetchDocuments,
    fetchChildDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    selectDocument,
    updateDocumentOrder,
    fetchDocument,
    refreshAllChildDocuments,
    documentsLoading,
    documentLoading,
  ]);

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}

