// App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { NotificationProvider } from './contexts/NotificationContext';
import MainLayout from './components/layout/MainLayout';
import AuthRouter from './components/layout/AuthRouter';
import ErrorBoundary from './components/error/ErrorBoundary';
import { setRedirectToLogin } from './services/api';

const AppContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // API 인터셉터에 리다이렉트 함수 설정
  useEffect(() => {
    setRedirectToLogin(() => {
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  return (
    <>
      {user ? (
        <NotificationProvider>
          <WorkspaceProvider>
            <DocumentProvider>
              <MainLayout />
            </DocumentProvider>
          </WorkspaceProvider>
        </NotificationProvider>
      ) : (
        <AuthRouter />
      )}
    </>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

const Root = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default Root;