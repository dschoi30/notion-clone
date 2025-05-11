// src/contexts/DocumentContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as documentApi from '@/services/documentApi';
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
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentWorkspace } = useWorkspace();

  // 워크스페이스가 변경될 때마다 문서 상태 초기화
  useEffect(() => {
    if (!currentWorkspace || documents.length === 0) return;
    // 이미 문서가 선택되어 있으면 자동 선택하지 않음
    if (currentDocument) return;

    const lastId = localStorage.getItem(`lastDocumentId:${currentWorkspace.id}`);
    const found = documents.find(doc => String(doc.id) === String(lastId));
    if (found) {
      selectDocument(found);
    } else {
      selectDocument(documents[0]);
    }
  }, [documents, currentWorkspace]);

  useEffect(() => {
    // 워크스페이스가 바뀌면 currentDocument를 즉시 초기화
    setCurrentDocument(null);
  }, [currentWorkspace]);

  const fetchDocuments = useCallback(async () => {
    if (!currentWorkspace) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await documentApi.getDocuments(currentWorkspace.id);
      setDocuments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  const createDocument = useCallback(async (documentData) => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      setError(null);
      const newDocument = await documentApi.createDocument(currentWorkspace.id, documentData);
      setDocuments(prev => [...prev, newDocument]);
      return newDocument;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
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
      setLoading(true);
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
      setLoading(false);
    }
  }, [currentWorkspace, currentDocument, documents]);

  const selectDocument = useCallback(async (document) => {
    if (!currentWorkspace || !document) return;

    try {
      setLoading(true);
      setError(null);
      const fullDocument = await documentApi.getDocument(currentWorkspace.id, document.id);
      setCurrentDocument(fullDocument);
      localStorage.setItem(`lastDocumentId:${currentWorkspace.id}`, document.id);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch document:', err);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  const updateDocumentOrder = useCallback(async (documentIds) => {
    if (!currentWorkspace) return;
    await documentApi.updateDocumentOrder(currentWorkspace.id, documentIds);
    // 서버 반영 후 fetchDocuments()로 최신화 가능
  }, [currentWorkspace]);

  const value = {
    documents,
    currentDocument,
    loading,
    error,
    fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    selectDocument,
    updateDocumentOrder,
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}