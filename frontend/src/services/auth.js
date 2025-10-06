import api from './api';

export const login = async (email, password) => {
  try {
    const response = await api.post('/api/auth/login', { email, password });
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    return response.data;
  } catch (error) {
    console.error('로그인 실패:', error);
    throw error;
  }
};

export const register = async (email, password, name) => {
  try {
    const response = await api.post('/api/auth/register', { email, password, name });
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    return response.data;
  } catch (error) {
    console.error('회원가입 실패:', error);
    throw error;
  }
};

export const loginWithGoogle = async (credential) => {
  try {
    const response = await api.post('/api/auth/google', { credential });
    
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }

    return response.data;
  } catch (error) {
    console.error('Google 로그인 실패:', error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  localStorage.removeItem('userId');
  // 로그인 페이지로 리다이렉트
  window.location.href = '/login';
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/auth/me');
    return response.data;
  } catch (error) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    throw error;
  }
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('accessToken');
}; 