// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as auth from '@/services/auth';
import { createLogger } from '@/lib/logger';
import { authSync } from '@/utils/authSync';
import { useToast } from '@/hooks/useToast';
import { setGlobalToast } from '@/services/api';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const alog = createLogger('AuthContext');
  const { toast } = useToast();
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    const parsedUser = savedUser ? JSON.parse(savedUser) : null;
    return parsedUser;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 기존 토큰 제거 공통 함수
  const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
  };

  // 전역 Toast 함수 설정
  useEffect(() => {
    setGlobalToast(toast);
  }, [toast]);


  // authSync 이벤트 처리
  useEffect(() => {
    const handleAuthSyncLogout = (event) => {
      const { reason, userId } = event.detail;
      alog.info('다른 탭에서 로그아웃 요청:', reason, 'userId:', userId);

      // 현재 사용자와 다른 사용자의 세션 무효화인지 확인
      const currentUserId = localStorage.getItem('userId');
      if (userId && currentUserId && String(userId) !== currentUserId) {
        alog.info('다른 사용자의 세션 무효화 - 현재 사용자에게 영향 없음');
        return;
      }

      let message;
      let title;

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

    const handleAuthSyncLogin = (event) => {
      const { user } = event.detail;
      alog.info('다른 탭에서 로그인 성공:', user);
    };

    window.addEventListener('authSyncLogout', handleAuthSyncLogout);
    window.addEventListener('authSyncLogin', handleAuthSyncLogin);

    return () => {
      window.removeEventListener('authSyncLogout', handleAuthSyncLogout);
      window.removeEventListener('authSyncLogin', handleAuthSyncLogin);
    };
  }, [alog, toast, navigate]);

  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // 기존 토큰 제거 (새 로그인 시 이전 세션 무효화)
      clearTokens();
      
      const data = await auth.login(email, password);
      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        profileImageUrl: data.user.profileImageUrl
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userId', userData.id);
      
      // 다른 탭에 로그인 알림
      authSync.notifyLogin(userData);
      
    } catch (err) {
      alog.error('로그인 에러:', err);
      setError(err.message);
      toast({
        title: '로그인 실패',
        description: err.message || '이메일 또는 비밀번호를 확인해주세요.',
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email, password, name) => {
    try {
      setLoading(true);
      setError(null);
      
      // 기존 토큰 제거
      clearTokens();
      
      const data = await auth.register(email, password, name);
      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        profileImageUrl: data.user.profileImageUrl
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userId', userData.id);
      
      // 다른 탭에 로그인 알림
      authSync.notifyLogin(userData);
      
    } catch (err) {
      alog.error('회원가입 에러:', err);
      setError(err.message);
      toast({
        title: '회원가입 실패',
        description: err.message || '입력한 정보를 다시 확인해주세요.',
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    try {
      setLoading(true);
      setError(null);
      
      // 기존 토큰 제거
      clearTokens();
      
      const data = await auth.loginWithGoogle(credential);
      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        profileImageUrl: data.user.profileImageUrl
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userId', userData.id);
      
      // 다른 탭에 로그인 알림
      authSync.notifyLogin(userData);
      
    } catch (err) {
      alog.error('구글 로그인 에러:', err);
      setError(err.message);
      toast({
        title: '구글 로그인 실패',
        description: err.message || '구글 계정으로 로그인할 수 없습니다. 다시 시도해주세요.',
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
    
    // 다른 탭에 로그아웃 알림
    authSync.notifyLogout('MANUAL_LOGOUT');
  }, []);

  const updateUser = useCallback((updatedUserData) => {
    const userData = {
      id: updatedUserData.id || user?.id,
      email: updatedUserData.email,
      name: updatedUserData.name,
      profileImageUrl: updatedUserData.profileImageUrl
    };
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  }, [user]);

  const value = {
    user,
    loading,
    error,
    login,
    register,
    loginWithGoogle,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}