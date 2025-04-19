// src/contexts/DocumentContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { documentApi } from '../services/documentApi';

const DocumentContext = createContext(null);

export const useDocument = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
};

export const DocumentProvider = ({ children }) => {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);

  const loadDocuments = useCallback(async () => {
    const docs = await documentApi.getDocuments();
    setDocuments(docs);
  }, []);

  const loadFolders = useCallback(async () => {
    const folderList = await documentApi.getFolders();
    setFolders(folderList);
  }, []);

  const getDocument = useCallback(async (id) => {
    return await documentApi.getDocument(id);
  }, []);

  const createDocument = useCallback(async (data) => {
    const newDoc = await documentApi.createDocument(data);
    setDocuments((prev) => [...prev, newDoc]);
    return newDoc;
  }, []);

  const updateDocument = useCallback(async (id, data) => {
    const updatedDoc = await documentApi.updateDocument(id, data);
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? updatedDoc : doc))
    );
    return updatedDoc;
  }, []);

  const deleteDocument = useCallback(async (id) => {
    await documentApi.deleteDocument(id);
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  }, []);

  const createFolder = useCallback(async (data) => {
    const newFolder = await documentApi.createFolder(data);
    setFolders((prev) => [...prev, newFolder]);
    return newFolder;
  }, []);

  const deleteFolder = useCallback(async (id) => {
    await documentApi.deleteFolder(id);
    setFolders((prev) => prev.filter((folder) => folder.id !== id));
  }, []);

  const value = {
    documents,
    folders,
    loadDocuments,
    loadFolders,
    getDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    createFolder,
    deleteFolder,
  };

  return (
    <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>
  );
};