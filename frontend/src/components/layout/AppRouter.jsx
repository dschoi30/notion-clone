// components/layout/AppRouter.jsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDocument } from '@/contexts/DocumentContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';
import { slugify } from '@/lib/utils';
import DocumentEditor from '@/components/documents/DocumentEditor';

const rlog = createLogger('AppRouter');

const AppRouter = () => {
  const { documents, documentsLoading, currentDocument } = useDocument();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 현재 URL에서 문서 ID 추출
  const getCurrentDocIdFromUrl = () => {
    const match = location.pathname.match(/^\/(\d+)(-.*)?$/);
    return match ? match[1] : null;
  };

  // 올바른 문서 경로로 네비게이션
  const navigateToCorrectDocument = (doc) => {
    const correctPath = `/${doc.id}-${slugify(doc.title)}`;
    if (location.pathname !== correctPath) {
      rlog.info('navigateToCorrectDocument', { from: location.pathname, to: correctPath });
      navigate(correctPath, { replace: true });
    }
  };

  // 로딩이 완료된 후에만 리다이렉트 경로 결정
  const getDefaultDocPath = () => {
    if (workspaceLoading || documentsLoading || !currentWorkspace || documents.length === 0) {
      return null;
    }
    
    // 사용자별 마지막 문서 ID 조회
    const storageKey = user?.id ? `lastDocumentId:${user.id}:${currentWorkspace.id}` : null;
    const lastId = storageKey ? localStorage.getItem(storageKey) : null;
    let doc = null;
    
    if (lastId) doc = documents.find(d => String(d.id) === String(lastId));
    if (!doc) doc = documents[0];
    
    if (!doc) return null;
    return `/${doc.id}-${slugify(doc.title)}`;
  };

  // URL 검증 및 리다이렉트 로직
  useEffect(() => {
    if (workspaceLoading || documentsLoading || !currentWorkspace || documents.length === 0) return;

    const currentUrlDocId = getCurrentDocIdFromUrl();
    
    if (currentUrlDocId) {
      const foundDoc = documents.find(d => String(d.id) === String(currentUrlDocId));
      if (!foundDoc) {
        if (currentDocument && String(currentDocument.id) === String(currentUrlDocId)) {
          rlog.info('url doc allowed though not in list (currentDocument loaded)', { currentUrlDocId });
          return;
        }
        
        rlog.warn('url doc not in workspace, redirecting', { currentUrlDocId, workspaceId: currentWorkspace.id });
        
        // 사용자별 마지막 문서 ID 조회
        const storageKey = user?.id ? `lastDocumentId:${user.id}:${currentWorkspace.id}` : null;
        const lastId = storageKey ? localStorage.getItem(storageKey) : null;
        let targetDoc = null;
        
        if (lastId) {
          targetDoc = documents.find(d => String(d.id) === String(lastId));
          if (!targetDoc && storageKey) {
            localStorage.removeItem(storageKey);
          }
        }
        
        if (!targetDoc) {
          targetDoc = documents[0];
        }
        
        if (targetDoc) {
          navigateToCorrectDocument(targetDoc);
        }
      }
    } else if (location.pathname === '/') {
      // 사용자별 마지막 문서 ID 조회
      const storageKey = user?.id ? `lastDocumentId:${user.id}:${currentWorkspace.id}` : null;
      const lastId = storageKey ? localStorage.getItem(storageKey) : null;
      let targetDoc = null;
      
      if (lastId) {
        targetDoc = documents.find(d => String(d.id) === String(lastId));
        if (!targetDoc && storageKey) {
          localStorage.removeItem(storageKey);
        }
      }
      
      if (!targetDoc) {
        targetDoc = documents[0];
      }
      
      if (targetDoc) {
        navigateToCorrectDocument(targetDoc);
      }
    }
  }, [currentWorkspace, documents, workspaceLoading, documentsLoading, currentDocument, user]);

  const defaultPath = getDefaultDocPath();

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          workspaceLoading || documentsLoading ? (
            <div className="p-4 text-sm">로딩 중...</div>
          ) : defaultPath ? (
            <Navigate to={defaultPath} replace />
          ) : (
            <div className="p-4 text-sm">문서가 없습니다.</div>
          )
        } 
      />
      <Route path="/:idSlug" element={<DocumentEditor />} />
    </Routes>
  );
};

export default AppRouter;
