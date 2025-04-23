// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { WorkspaceTree } from './components/workspace/WorkspaceTree';
import DocumentList from './components/documents/DocumentList';
import DocumentEditor from './components/documents/DocumentEditor';

const AppLayout = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <WorkspaceProvider>
      <DocumentProvider>
        <div className="flex h-screen">
          <aside className="w-64 border-r bg-gray-50">
            <div className="p-4">
              <h1 className="mb-4 text-xl font-bold">Notion Clone</h1>
            </div>
            <WorkspaceTree />
          </aside>
          <div className="flex flex-1">
            <aside className="w-64 border-r">
              <DocumentList />
            </aside>
            <main className="flex-1 overflow-auto">
              <DocumentEditor />
            </main>
          </div>
        </div>
      </DocumentProvider>
    </WorkspaceProvider>
  );
};

const PublicLayout = () => {
  return (
    <div className="flex flex-col justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md mx-auto">
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
      {user ? <AppLayout /> : <PublicLayout />}
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