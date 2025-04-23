// src/contexts/DocumentContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
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

  const fetchDocuments = useCallback(async () => {
    if (!currentWorkspace) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await documentApi.getDocuments(currentWorkspace.id);
      setDocuments(data);
      if (data.length > 0 && !currentDocument) {
        setCurrentDocument(data[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, currentDocument]);

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
      setLoading(true);
      setError(null);
      const updatedDocument = await documentApi.updateDocument(currentWorkspace.id, id, documentData);
      setDocuments(prev => prev.map(doc => 
        doc.id === id ? updatedDocument : doc
      ));
      if (currentDocument?.id === id) {
        setCurrentDocument(updatedDocument);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
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

  const selectDocument = useCallback((document) => {
    setCurrentDocument(document);
  }, []);

  const value = {
    documents,
    currentDocument,
    loading,
    error,
    fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    selectDocument
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}