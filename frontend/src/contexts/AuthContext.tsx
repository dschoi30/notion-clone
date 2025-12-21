// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useShallow } from 'zustand/react/shallow';
import { createLogger } from '@/lib/logger';
import { useToast } from '@/hooks/useToast';
import { setGlobalToast } from '@/services/api';
import { setSentryUser } from '@/lib/sentry';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const alog = createLogger('AuthContext');

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthSyncLogoutEvent extends CustomEvent {
  detail: {
    reason: 'NEW_LOGIN' | 'TOKEN_EXPIRED' | 'LOGOUT';
    userId?: number;
  };
}

interface AuthSyncLoginEvent extends CustomEvent {
  detail: {
    user: User;
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  
  // zustand store에서 상태와 액션을 한 번에 가져오기 (useShallow로 최적화)
  const {
    user,
    loading,
    error,
    login,
    register,
    loginWithGoogle,
    logout,
    updateUser,
    clearError
  } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      loading: state.loading,
      error: state.error,
      login: state.login,
      register: state.register,
      loginWithGoogle: state.loginWithGoogle,
      logout: state.logout,
      updateUser: state.updateUser,
      clearError: state.clearError
    }))
  );

  // 전역 Toast 함수 설정
  useEffect(() => {
    setGlobalToast(toast);
  }, [toast]);

  // Sentry 사용자 컨텍스트 설정
  useEffect(() => {
    if (user) {
      setSentryUser(user);
    } else {
      setSentryUser(null);
    }
  }, [user]);

  // 에러 처리 (useWorkspacePermissions.js 패턴과 동일)
  useEffect(() => {
    if (error) {
      alog.error('AuthStore 에러 발생', error);
      
      // 에러 타입별 커스텀 메시지 설정
      let customMessage: string | null = null;
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 401) {
        customMessage = '이메일 또는 비밀번호를 확인해주세요.';
      } else if (apiError.response?.status === 400) {
        customMessage = '입력한 정보를 다시 확인해주세요.';
      }
      
      handleError(error, {
        customMessage,
        showToast: true
      });
      
      // 에러 처리 완료 후 다음 렌더링 사이클에서 에러 상태 초기화
      // (에러 처리 로직이 완전히 실행된 후 clear)
      const timeoutId = setTimeout(() => {
        clearError();
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [error, handleError, clearError]);

  // authSync 이벤트 처리
  useEffect(() => {
    const handleAuthSyncLogout = (event: Event) => {
      const customEvent = event as AuthSyncLogoutEvent;
      const { reason, userId } = customEvent.detail;
      alog.info('다른 탭에서 로그아웃 요청:', reason, 'userId:', userId);

      // 현재 사용자와 다른 사용자의 세션 무효화인지 확인
      const currentUserId = localStorage.getItem('userId');
      if (userId && currentUserId && String(userId) !== String(currentUserId)) {
        alog.info('다른 사용자의 세션 무효화 - 현재 사용자에게 영향 없음');
        return;
      }

      let message: string;
      let title: string;

      if (reason === 'NEW_LOGIN') {
        title = '다른 계정으로 로그인됨';
        message = '다른 계정으로 로그인되어 현재 세션이 종료됩니다.';
      } else if (reason === 'TOKEN_EXPIRED') {
        title = '세션 만료';
        message = '로그인 시간이 만료되었습니다. 다시 로그인해주세요.';
      } else {
        title = '세션 종료';
        message = '다른 탭에서 로그아웃되어 현재 세션이 종료됩니다.';
      }

      toast({
        title: title,
        description: message,
        variant: 'destructive'
      });

      // 세션 만료인 경우 toast 메시지 표시 후 리다이렉트
      if (reason === 'TOKEN_EXPIRED') {
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
      }
    };

    const handleAuthSyncLogin = (event: Event) => {
      const customEvent = event as AuthSyncLoginEvent;
      const { user } = customEvent.detail;
      alog.info('다른 탭에서 로그인 성공:', user);
    };

    window.addEventListener('authSyncLogout', handleAuthSyncLogout as EventListener);
    window.addEventListener('authSyncLogin', handleAuthSyncLogin as EventListener);

    return () => {
      window.removeEventListener('authSyncLogout', handleAuthSyncLogout as EventListener);
      window.removeEventListener('authSyncLogin', handleAuthSyncLogin as EventListener);
    };
  }, [alog, toast, navigate]);

  // 기존 API와 호환성을 위한 래퍼 함수들
  const loginWrapper = useCallback(async (email: string, password: string) => {
    try {
      await login(email, password);
    } catch (err) {
      // 에러는 store에서 처리하고, useEffect에서 handleError 호출됨
      throw err;
    }
  }, [login]);

  const registerWrapper = useCallback(async (email: string, password: string, name: string) => {
    try {
      await register(email, password, name);
    } catch (err) {
      // 에러는 store에서 처리하고, useEffect에서 handleError 호출됨
      throw err;
    }
  }, [register]);

  const loginWithGoogleWrapper = useCallback(async (credential: string) => {
    try {
      await loginWithGoogle(credential);
    } catch (err) {
      // 에러는 store에서 처리하고, useEffect에서 handleError 호출됨
      throw err;
    }
  }, [loginWithGoogle]);

  const logoutWrapper = useCallback(async () => {
    logout();
  }, [logout]);

  const updateUserWrapper = useCallback(async (userData: Partial<User>) => {
    updateUser(userData);
  }, [updateUser]);

  const value: AuthContextType = {
    user,
    loading,
    error: error instanceof Error ? error.message : (error ? String(error) : null), // 기존 API 호환성을 위해 message만 반환
    login: loginWrapper,
    register: registerWrapper,
    loginWithGoogle: loginWithGoogleWrapper,
    logout: logoutWrapper,
    updateUser: updateUserWrapper
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

