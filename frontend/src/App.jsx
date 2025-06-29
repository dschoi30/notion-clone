// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import { DocumentProvider, useDocument } from './contexts/DocumentContext';
import Sidebar from './components/layout/Sidebar';
import DocumentEditor from './components/documents/DocumentEditor';
import { NotificationProvider } from './contexts/NotificationContext';
import { slugify } from './lib/utils';

const AppLayout = () => {
  const { documents } = useDocument();
  const { currentWorkspace } = useWorkspace();

  // / 경로 접근 시 lastId로 리다이렉트
  const getDefaultDocPath = () => {
    if (!currentWorkspace || documents.length === 0) return null;
    const lastId = localStorage.getItem(`lastDocumentId:${currentWorkspace.id}`);
    let doc = documents.find(d => String(d.id) === String(lastId));
    if (!doc) doc = documents[0];
    if (!doc) return null;
    return `/${doc.id}-${slugify(doc.title)}`;
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 pl-64">
        <Routes>
          <Route path="/" element={getDefaultDocPath() ? <Navigate to={getDefaultDocPath()} replace /> : <div className="p-4">문서가 없습니다.</div>} />
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