// App.jsx
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import * as Sentry from '@sentry/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { NotificationProvider } from './contexts/NotificationContext';
import MainLayout from './components/layout/MainLayout';
import AuthRouter from './components/layout/AuthRouter';
import ErrorBoundary from './components/error/ErrorBoundary';
import { queryClient } from './lib/queryClient';

const AppContent = () => {
  const { user } = useAuth();

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

// Sentry ErrorBoundary로 감싸기
const SentryWrappedAppContent = Sentry.withErrorBoundary(AppContent, {
  fallback: ({ error, resetError }) => <ErrorBoundary />,
  beforeCapture: (scope, error, errorInfo) => {
    scope.setContext('react', {
      componentStack: errorInfo?.componentStack,
    });
  },
});

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <SentryWrappedAppContent />
          </AuthProvider>
        </Router>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;