// App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { createLogger } from '@/lib/logger';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import { DocumentProvider, useDocument } from './contexts/DocumentContext';
import Sidebar from './components/layout/Sidebar';
import DocumentEditor from './components/documents/DocumentEditor';
import { NotificationProvider } from './contexts/NotificationContext';
import { slugify } from './lib/utils';

const AppLayout = () => {
  const { documents, documentsLoading } = useDocument();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const rlog = createLogger('router');

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

  // 워크스페이스나 문서 목록이 변경될 때만 URL 검증 (location.pathname 의존성 제거로 무한 루프 방지)
  useEffect(() => {
    if (workspaceLoading || documentsLoading || !currentWorkspace || documents.length === 0) return;

    const currentUrlDocId = getCurrentDocIdFromUrl();
    // URL에 문서 ID가 있는 경우 - 해당 문서가 현재 워크스페이스에 존재하는지만 검증
    if (currentUrlDocId) {
      const foundDoc = documents.find(d => String(d.id) === String(currentUrlDocId));
      if (!foundDoc) {
        // URL의 문서 ID가 현재 워크스페이스에 없으면 올바른 문서로 리다이렉트
        rlog.warn('url doc not in workspace, redirecting', { currentUrlDocId, workspaceId: currentWorkspace.id });
        
        const lastId = localStorage.getItem(`lastDocumentId:${currentWorkspace.id}`);
        let targetDoc = null;
        
        if (lastId) {
          targetDoc = documents.find(d => String(d.id) === String(lastId));
          if (!targetDoc) {
            localStorage.removeItem(`lastDocumentId:${currentWorkspace.id}`);
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
      // 루트 경로인 경우 적절한 문서로 리다이렉트
      const lastId = localStorage.getItem(`lastDocumentId:${currentWorkspace.id}`);
      let targetDoc = null;
      
      if (lastId) {
        targetDoc = documents.find(d => String(d.id) === String(lastId));
        if (!targetDoc) {
          localStorage.removeItem(`lastDocumentId:${currentWorkspace.id}`);
        }
      }
      
      if (!targetDoc) {
        targetDoc = documents[0];
      }
      
      if (targetDoc) {
        navigateToCorrectDocument(targetDoc);
      }
    }
  }, [currentWorkspace, documents, workspaceLoading, documentsLoading]); // location.pathname 의존성 제거

  // 로딩이 완료된 후에만 리다이렉트 경로 결정
  const getDefaultDocPath = () => {
    // 워크스페이스나 문서가 아직 로딩 중이면 null 반환
    if (workspaceLoading || documentsLoading || !currentWorkspace || documents.length === 0) {
      return null;
    }
    
    const lastId = localStorage.getItem(`lastDocumentId:${currentWorkspace.id}`);
    let doc = null;
    
    // lastId가 있으면 현재 문서 목록에서 찾기
    if (lastId) doc = documents.find(d => String(d.id) === String(lastId));
    
    // lastId에 해당하는 문서가 없으면 첫 번째 문서 사용
    if (!doc) doc = documents[0];
    
    if (!doc) return null;
    return `/${doc.id}-${slugify(doc.title)}`;
  };

  const defaultPath = getDefaultDocPath();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 pl-64">
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
      </div>
    </div>
  );
};

const PublicLayout = () => {
  return (
    <div className="flex flex-col justify-center min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-md">
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </div>
  );
};

const App = () => {
  const { user } = useAuth();

  return (
    <Router>
      {user ? (
        <NotificationProvider>
          <WorkspaceProvider>
            <DocumentProvider>
              <AppLayout />
            </DocumentProvider>
          </WorkspaceProvider>
        </NotificationProvider>
      ) : (
        <PublicLayout />
      )}
    </Router>
  );
};

const Root = () => {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

export default Root;