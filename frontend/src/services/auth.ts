import api from './api';
import { createLogger } from '@/lib/logger';
import type { User } from '@/types';

const log = createLogger('auth');

interface LoginResponse {
  accessToken: string;
  user: User;
}

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface GoogleLoginRequest {
  credential: string;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/api/auth/login', { email, password } as LoginRequest);
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    return response.data;
  } catch (error) {
    log.error('로그인 실패', error);
    throw error;
  }
};

export const register = async (email: string, password: string, name: string): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/api/auth/register', { email, password, name } as RegisterRequest);
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    return response.data;
  } catch (error) {
    log.error('회원가입 실패', error);
    throw error;
  }
};

export const loginWithGoogle = async (credential: string): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/api/auth/google', { credential } as GoogleLoginRequest);
    
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }

    return response.data;
  } catch (error) {
    log.error('Google 로그인 실패', error);
    throw error;
  }
};

export const logout = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  localStorage.removeItem('userId');
  // 로그인 페이지로 리다이렉트
  window.location.href = '/login';
};

export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await api.get<User>('/api/users/me');
    return response.data;
  } catch (error) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    throw error;
  }
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('accessToken');
};
