// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { DocumentProvider } from './contexts/DocumentContext';
import Sidebar from './components/layout/Sidebar';
import DocumentEditor from './components/documents/DocumentEditor';
import { NotificationProvider } from './contexts/NotificationContext';

const AppLayout = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <NotificationProvider>
      <WorkspaceProvider>
        <DocumentProvider>
          <div className="flex h-screen">
            <Sidebar />
            <DocumentEditor />
          </div>
        </DocumentProvider>
      </WorkspaceProvider>
    </NotificationProvider>
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