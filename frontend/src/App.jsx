// App.jsx
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { NotificationProvider } from './contexts/NotificationContext';
import MainLayout from './components/layout/MainLayout';
import AuthRouter from './components/layout/AuthRouter';
import ErrorBoundary from './components/error/ErrorBoundary';

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

const App = () => {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;