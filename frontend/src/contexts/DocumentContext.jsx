// src/contexts/DocumentContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as documentApi from '@/services/documentApi';
import { useWorkspace } from './WorkspaceContext';
import { slugify } from '@/lib/utils';

const DocumentContext = createContext();

export function useDocument() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
}

export function DocumentProvider({ children }) {
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentWorkspace } = useWorkspace();

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
      const data = await documentApi.getDocuments(currentWorkspace.id);
      
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

  const createDocument = useCallback(async (documentData) => {
    if (!currentWorkspace) return;

    try {
      setDocumentsLoading(true);
      setError(null);
      const newDocument = await documentApi.createDocument(currentWorkspace.id, documentData);
      setDocuments(prev => [...prev, newDocument]);
      return newDocument;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setDocumentsLoading(false);
    }
  }, [currentWorkspace]);

  const updateDocument = useCallback(async (id, documentData) => {
    if (!currentWorkspace) return;

    try {
      setError(null);
      await documentApi.updateDocument(currentWorkspace.id, id, documentData);
      setDocuments(prev => prev.map(doc =>
        doc.id === id ? { ...doc, ...documentData } : doc
      ));
      if (currentDocument?.id === id) {
        setCurrentDocument(prev => prev ? { ...prev, ...documentData } : prev);
      }
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

  const selectDocument = useCallback(async (document) => {
    if (!currentWorkspace || !document) return;
    try {
      setDocumentLoading(true);
      setError(null);
      const fullDocument = await documentApi.getDocument(currentWorkspace.id, document.id);
      
      // 조회된 문서가 현재 워크스페이스에 속하는지 검증
      if (fullDocument.workspaceId && String(fullDocument.workspaceId) !== String(currentWorkspace.id)) {
        console.error(`문서 ${document.id}는 다른 워크스페이스(${fullDocument.workspaceId})에 속합니다. 현재 워크스페이스: ${currentWorkspace.id}`);
        throw new Error(`문서가 현재 워크스페이스에 속하지 않습니다.`);
      }
      
      setCurrentDocument(fullDocument);
      localStorage.setItem(`lastDocumentId:${currentWorkspace.id}`, document.id);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch document:', err);
      // 에러 발생 시 현재 문서를 null로 설정
      setCurrentDocument(null);
      // localStorage에서 잘못된 documentId 제거
      localStorage.removeItem(`lastDocumentId:${currentWorkspace.id}`);
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

  // 단일 문서 정보 갱신용 fetchDocument 함수 추가
  const fetchDocument = useCallback(async (documentId) => {
    if (!currentWorkspace || !documentId) return;
    try {
      setDocumentLoading(true);
      setError(null);
      const fullDocument = await documentApi.getDocument(currentWorkspace.id, documentId);
      setCurrentDocument(fullDocument);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch document:', err);
    } finally {
      setDocumentLoading(false);
    }
  }, [currentWorkspace]);

  // parentId 기반 하위 문서(서브페이지) 목록 조회
  const fetchChildDocuments = useCallback(async (parentId) => {
    if (!currentWorkspace) return [];
    try {
      setDocumentsLoading(true);
      setError(null);
      const data = await documentApi.getChildDocuments(currentWorkspace.id, parentId);
      return data;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setDocumentsLoading(false);
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
    documentsLoading,
    documentLoading,
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}