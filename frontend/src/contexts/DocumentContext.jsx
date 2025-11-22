// src/contexts/DocumentContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as documentApi from '@/services/documentApi';
import { createLogger } from '@/lib/logger';
import { useWorkspace } from './WorkspaceContext';

const DocumentContext = createContext();

export function useDocument() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
}

export function DocumentProvider({ children }) {
  const rlog = createLogger('router');
  const [currentDocument, setCurrentDocument] = useState(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const lastSelectRef = React.useRef({ id: null, at: 0 });

  // React Query로 문서 목록 조회
  const {
    data: documentsData,
    isLoading: documentsLoading,
    error: documentsError,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ['documents', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      
      // 전체 목록 조회 (페이지네이션 없음)
      const data = await documentApi.getDocumentList(currentWorkspace.id);
      
      // 백엔드에서 다른 워크스페이스 문서가 섞여서 올 경우를 대비한 필터링
      const currentWorkspaceId = String(currentWorkspace.id);
      const filteredData = data.filter(doc => {
        const docWorkspaceId = doc.workspaceId || doc.workspace?.id;
        return !docWorkspaceId || String(docWorkspaceId) === currentWorkspaceId;
      });
      
      return {
        documents: filteredData,
        pagination: {
          page: 0,
          size: filteredData.length,
          totalPages: 1,
          totalElements: filteredData.length,
          hasNext: false,
        },
      };
    },
    enabled: !!currentWorkspace,
    staleTime: 1000 * 60 * 2, // 2분 - 문서 목록은 자주 변경되므로 짧게 설정
  });

  // React Query 데이터를 로컬 상태로 동기화
  const documents = documentsData?.documents || [];
  const pagination = documentsData?.pagination || {
    page: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
    hasNext: false,
  };
  const error = documentsError?.message || null;

  // currentWorkspace 변경 시 즉시 상태 초기화
  useEffect(() => {
    // 즉시 모든 상태 초기화 (이전 워크스페이스 데이터 제거)
    setCurrentDocument(null);
    // React Query 캐시도 무효화
    if (currentWorkspace) {
      queryClient.invalidateQueries({ queryKey: ['documents', currentWorkspace.id] });
    }
  }, [currentWorkspace, queryClient]);

  // fetchDocuments 함수는 기존 API와 호환성을 위해 유지 (refetch로 동작)
  const fetchDocuments = useCallback(async (page = null, size = null) => {
    if (!currentWorkspace) return;
    
    // 페이지네이션 파라미터가 있으면 별도 처리 (추후 개선 가능)
    if (page !== null && size !== null) {
      try {
        const response = await documentApi.getDocumentList(currentWorkspace.id, page, size);
        
        // 백엔드에서 다른 워크스페이스 문서가 섞여서 올 경우를 대비한 필터링
        const currentWorkspaceId = String(currentWorkspace.id);
        const filteredData = response.content.filter(doc => {
          const docWorkspaceId = doc.workspaceId || doc.workspace?.id;
          return !docWorkspaceId || String(docWorkspaceId) === currentWorkspaceId;
        });
        
        // React Query 캐시 업데이트
        queryClient.setQueryData(['documents', currentWorkspace.id], {
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
        rlog.error('fetchDocuments 에러', err);
        throw err;
      }
    } else {
      // 전체 목록 조회는 React Query refetch 사용
      await refetchDocuments();
    }
  }, [currentWorkspace, queryClient, refetchDocuments]);

  const createDocument = useCallback(async (documentData, options = {}) => {
    if (!currentWorkspace) return;

    try {
      const newDocument = await documentApi.createDocument(currentWorkspace.id, documentData);
      
      // React Query 캐시에 새 문서 추가
      queryClient.setQueryData(['documents', currentWorkspace.id], (oldData) => {
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
      rlog.error('createDocument 에러', err);
      throw err;
    }
  }, [currentWorkspace, queryClient]);

  const updateDocument = useCallback(async (id, documentData) => {
    if (!currentWorkspace) return;

    try {
      const updated = await documentApi.updateDocument(currentWorkspace.id, id, documentData);
      
      // 기존 currentDocument의 모든 필드를 보존하고, 업데이트된 필드만 덮어쓰기
      const mergedUpdated = {
        ...(currentDocument?.id === id ? currentDocument : {}),
        ...updated,
        permissions: (Array.isArray(updated?.permissions) && updated.permissions.length > 0)
          ? updated.permissions
          : (currentDocument?.permissions || []),
      };
      
      // React Query 캐시 업데이트
      queryClient.setQueryData(['documents', currentWorkspace.id], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          documents: oldData.documents.map(doc => (doc.id === id ? { ...doc, ...mergedUpdated } : doc)),
        };
      });
      
      if (currentDocument?.id === id) setCurrentDocument(mergedUpdated);
      return mergedUpdated;
    } catch (err) {
      rlog.error('updateDocument 에러', err);
      throw err;
    }
  }, [currentWorkspace, currentDocument, queryClient]);

  const deleteDocument = useCallback(async (id) => {
    if (!currentWorkspace) return;

    try {
      await documentApi.deleteDocument(currentWorkspace.id, id);
      
      // React Query 캐시에서 문서 제거
      queryClient.setQueryData(['documents', currentWorkspace.id], (oldData) => {
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
      
      if (currentDocument?.id === id) {
        const remainingDocs = documents.filter(d => d.id !== id);
        setCurrentDocument(remainingDocs[0] || null);
      }
    } catch (err) {
      rlog.error('deleteDocument 에러', err);
      throw err;
    }
  }, [currentWorkspace, currentDocument, documents, queryClient]);

  const selectDocument = useCallback(async (document, options = {}) => {
    if (!currentWorkspace || !document) return;
    if (documentLoading && currentDocument?.id === document.id) {
      rlog.info('selectDocument skip (in-flight same id)', { id: document.id, src: options.source });
      return;
    }
    if (currentDocument?.id === document.id) {
      rlog.info('selectDocument skip (already current)', { id: document.id, src: options.source });
      return;
    }
    // 중복 호출 스로틀 (2s)
    const now = Date.now();
    if (lastSelectRef.current.id === document.id && now - lastSelectRef.current.at < 2000) {
      rlog.warn('selectDocument throttled', { id: document.id, src: options.source });
      return;
    }
    // URL id와 불일치 시 방어 (외부 호출로 다른 문서로 이동되는 현상 차단)
    try {
      const urlDocId = window.location.pathname.match(/^\/(\d+)(?:-.+)?$/)?.[1];
      if (urlDocId && String(urlDocId) !== String(document.id)) {
        rlog.warn('selectDocument blocked by URL guard', { target: document.id, urlDocId, src: options.source });
        return;
      }
    } catch {}
    try {
      setDocumentLoading(true);
      rlog.info('selectDocument', { id: document.id, ws: currentWorkspace?.id, src: options.source });
      const fullDocument = await documentApi.getDocument(currentWorkspace.id, document.id);
      
      // 조회된 문서가 현재 워크스페이스에 속하는지 검증
      if (fullDocument.workspaceId && String(fullDocument.workspaceId) !== String(currentWorkspace.id)) {
        rlog.error('문서가 다른 워크스페이스에 속함', {
          documentId: document.id,
          documentWorkspaceId: fullDocument.workspaceId,
          currentWorkspaceId: currentWorkspace.id,
        });
        throw new Error(`문서가 현재 워크스페이스에 속하지 않습니다.`);
      }
      
      setCurrentDocument(fullDocument);
      lastSelectRef.current = { id: document.id, at: Date.now() };
      localStorage.setItem(`lastDocumentId:${currentWorkspace.id}`, document.id);
    } catch (err) {
      rlog.error('Failed to fetch document', err, { documentId: document.id });
      // 에러 발생 시 현재 문서를 유지 (예기치 않은 문서 전환 방지)
      throw err;
    } finally {
      setDocumentLoading(false);
    }
  }, [currentWorkspace]);

  const updateDocumentOrder = useCallback(async (documentIds) => {
    if (!currentWorkspace) return;
    try {
      await documentApi.updateDocumentOrder(currentWorkspace.id, documentIds);
      
      // React Query 캐시 업데이트 - sortOrder 업데이트
      queryClient.setQueryData(['documents', currentWorkspace.id], (oldData) => {
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
      rlog.error('updateDocumentOrder 에러', err);
      throw err;
    }
  }, [currentWorkspace, queryClient]);

  // 단일 문서 정보 갱신용 fetchDocument 함수 (silent 옵션 지원)
  const fetchDocument = useCallback(async (documentId, options = {}) => {
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
  }, [currentWorkspace]);

  // parentId 기반 하위 문서(서브페이지) 목록 조회
  const fetchChildDocuments = useCallback(async (parentId, options = {}) => {
    if (!currentWorkspace) return [];
    try {
      const data = await documentApi.getChildDocuments(currentWorkspace.id, parentId);
      return data;
    } catch (err) {
      // 403 에러는 API 인터셉터에서 처리하므로 여기서는 조용히 종료
      if (err.response?.status === 403) {
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
  const value = useMemo(() => ({
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