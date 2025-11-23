import api from './api';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth');

export const login = async (email, password) => {
  try {
    const response = await api.post('/api/auth/login', { email, password });
    // 보안: sessionStorage 사용 (XSS 위험 완화, 탭별 격리)
    if (response.data.accessToken) {
      sessionStorage.setItem('accessToken', response.data.accessToken);
    }
    return response.data;
  } catch (error) {
    log.error('로그인 실패', error);
    throw error;
  }
};

export const register = async (email, password, name) => {
  try {
    const response = await api.post('/api/auth/register', { email, password, name });
    // 보안: sessionStorage 사용 (XSS 위험 완화, 탭별 격리)
    if (response.data.accessToken) {
      sessionStorage.setItem('accessToken', response.data.accessToken);
    }
    return response.data;
  } catch (error) {
    log.error('회원가입 실패', error);
    throw error;
  }
};

export const loginWithGoogle = async (credential) => {
  try {
    const response = await api.post('/api/auth/google', { credential });
    
    // 보안: sessionStorage 사용 (XSS 위험 완화, 탭별 격리)
    if (response.data.accessToken) {
      sessionStorage.setItem('accessToken', response.data.accessToken);
    }

    return response.data;
  } catch (error) {
    log.error('Google 로그인 실패', error);
    throw error;
  }
};

export const logout = () => {
  // 보안: sessionStorage에서 토큰 제거
  sessionStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  localStorage.removeItem('userId');
  // 로그인 페이지로 리다이렉트
  window.location.href = '/login';
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/users/me');
    return response.data;
  } catch (error) {
    // 보안: sessionStorage에서 토큰 제거
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    throw error;
  }
};

export const isAuthenticated = () => {
  // 보안: sessionStorage에서 토큰 확인
  return !!sessionStorage.getItem('accessToken');
}; 