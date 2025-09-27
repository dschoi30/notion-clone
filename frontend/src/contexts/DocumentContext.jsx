// src/contexts/DocumentContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentWorkspace } = useWorkspace();
  const lastSelectRef = React.useRef({ id: null, at: 0 });

  // currentWorkspace 변경 시 즉시 상태 초기화 후 문서 목록 fetch
  useEffect(() => {
    // 즉시 모든 상태 초기화 (이전 워크스페이스 데이터 제거)
    setDocuments([]);
    setCurrentDocument(null);
    setError(null);

    if (currentWorkspace) fetchDocuments();
  }, [currentWorkspace]);

  const fetchDocuments = useCallback(async () => {
    if (!currentWorkspace) return;
    
    try {
      setDocumentsLoading(true);
      setError(null);
      // 경량 API 사용으로 성능 최적화
      const data = await documentApi.getDocumentList(currentWorkspace.id);
      
      // 백엔드에서 다른 워크스페이스 문서가 섞여서 올 경우를 대비한 필터링
      const filteredData = data.filter(doc => {
        // workspaceId 또는 workspace.id로 확인
        const docWorkspaceId = doc.workspaceId || doc.workspace?.id;
        
        // fetchDocuments 호출 시점과 완료 시점에 currentWorkspace가 동일한지 확인
        // (비동기 처리 중에 워크스페이스가 바뀔 수 있음)
        // 단순히 ID만 비교
        if (docWorkspaceId && String(docWorkspaceId) !== String(currentWorkspace.id)) {
          console.warn(`잘못된 워크스페이스 문서 필터링: 문서 ${doc.id}는 워크스페이스 ${docWorkspaceId}에 속함 (현재: ${currentWorkspace.id})`);
          return false;
        }
        return true;
      });
      
      setDocuments(filteredData);
    } catch (err) {
      console.error(`❌ fetchDocuments 에러:`, err);
      setError(err.message);
    } finally {
      setDocumentsLoading(false);
    }
  }, [currentWorkspace]);

  const createDocument = useCallback(async (documentData, options = {}) => {
    if (!currentWorkspace) return;

    try {
      // 테이블뷰에서 호출하는 경우 로딩 상태를 변경하지 않음
      if (!options.silent) {
        setDocumentsLoading(true);
      }
      setError(null);
      const newDocument = await documentApi.createDocument(currentWorkspace.id, documentData);
      setDocuments(prev => [...prev, newDocument]);
      return newDocument;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      if (!options.silent) {
        setDocumentsLoading(false);
      }
    }
  }, [currentWorkspace]);

  const updateDocument = useCallback(async (id, documentData) => {
    if (!currentWorkspace) return;

    try {
      setError(null);
      const updated = await documentApi.updateDocument(currentWorkspace.id, id, documentData);
      // 백엔드 응답에 permissions가 누락되면 기존 currentDocument.permissions를 유지(부모 권한 병합분 보존)
      const mergedUpdated = {
        ...updated,
        permissions: (Array.isArray(updated?.permissions) && updated.permissions.length > 0)
          ? updated.permissions
          : (currentDocument?.permissions || []),
      };
      // 서버 응답을 신뢰하여 감사필드(updatedAt/updatedBy 등) 포함 반영
      setDocuments(prev => prev.map(doc => (doc.id === id ? { ...doc, ...mergedUpdated } : doc)));
      if (currentDocument?.id === id) setCurrentDocument(mergedUpdated);
      return mergedUpdated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [currentWorkspace, currentDocument]);

  const deleteDocument = useCallback(async (id) => {
    if (!currentWorkspace) return;

    try {
      setDocumentsLoading(true);
      setError(null);
      await documentApi.deleteDocument(currentWorkspace.id, id);
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      if (currentDocument?.id === id) {
        setCurrentDocument(documents.find(d => d.id !== id) || null);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setDocumentsLoading(false);
    }
  }, [currentWorkspace, currentDocument, documents]);

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
      setError(null);
      rlog.info('selectDocument', { id: document.id, ws: currentWorkspace?.id, src: options.source });
      const fullDocument = await documentApi.getDocument(currentWorkspace.id, document.id);
      
      // 조회된 문서가 현재 워크스페이스에 속하는지 검증
      if (fullDocument.workspaceId && String(fullDocument.workspaceId) !== String(currentWorkspace.id)) {
        console.error(`문서 ${document.id}는 다른 워크스페이스(${fullDocument.workspaceId})에 속합니다. 현재 워크스페이스: ${currentWorkspace.id}`);
        throw new Error(`문서가 현재 워크스페이스에 속하지 않습니다.`);
      }
      
      setCurrentDocument(fullDocument);
      lastSelectRef.current = { id: document.id, at: Date.now() };
      localStorage.setItem(`lastDocumentId:${currentWorkspace.id}`, document.id);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch document:', err);
      // 에러 발생 시 현재 문서를 유지 (예기치 않은 문서 전환 방지)
    } finally {
      setDocumentLoading(false);
    }
  }, [currentWorkspace]);

  const updateDocumentOrder = useCallback(async (documentIds) => {
    if (!currentWorkspace) return;
    try {
      await documentApi.updateDocumentOrder(currentWorkspace.id, documentIds);
      // 로컬 상태를 직접 업데이트하여 화면 깜빡임 방지
      setDocuments(prev => {
        return prev.map(doc => {
          // documentIds에 포함된 문서들만 sortOrder 업데이트
          const newIndex = documentIds.indexOf(doc.id);
          if (newIndex !== -1) {
            return { ...doc, sortOrder: newIndex };
          }
          return doc;
        });
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [currentWorkspace]);

  // 단일 문서 정보 갱신용 fetchDocument 함수 (silent 옵션 지원)
  const fetchDocument = useCallback(async (documentId, options = {}) => {
    if (!currentWorkspace || !documentId) return;
    const isSilent = options && options.silent === true;
    const apply = options && options.apply !== false; // default true
    try {
      if (!isSilent) setDocumentLoading(true);
      setError(null);
      const fullDocument = await documentApi.getDocument(currentWorkspace.id, documentId);
      rlog.info('fetchDocument', { id: documentId, silent: isSilent, apply });
      if (apply) setCurrentDocument(fullDocument);
      return fullDocument;
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch document:', err);
    } finally {
      if (!isSilent) setDocumentLoading(false);
    }
  }, [currentWorkspace]);

  // parentId 기반 하위 문서(서브페이지) 목록 조회
  const fetchChildDocuments = useCallback(async (parentId, options = {}) => {
    if (!currentWorkspace) return [];
    try {
      // 사이드바에서 호출하는 경우 로딩 상태를 변경하지 않음
      if (!options.silent) {
        setDocumentsLoading(true);
      }
      setError(null);
      const data = await documentApi.getChildDocuments(currentWorkspace.id, parentId);
      return data;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      if (!options.silent) {
        setDocumentsLoading(false);
      }
    }
  }, [currentWorkspace]);

  // 모든 자식 문서들을 새로고침하는 함수 (버전 복원 시 사용)
  const refreshAllChildDocuments = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      setError(null);
      // 모든 문서를 다시 가져와서 자식 문서 정보도 최신화
      const allDocuments = await documentApi.getDocuments(currentWorkspace.id);
      setDocuments(allDocuments);
    } catch (err) {
      setError(err.message);
      console.error('Failed to refresh child documents:', err);
    }
  }, [currentWorkspace]);

  const value = {
    documents,
    currentDocument,
    error,
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
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}