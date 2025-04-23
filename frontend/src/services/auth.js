import api from './api';

export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    console.log('로그인 응답:', response.data);
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
    const response = await api.post('/auth/register', { email, password, name });
    console.log('회원가입 응답:', response.data);
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
    const response = await api.post('/auth/google', { credential });
    console.log('구글 로그인 응답:', response.data);
    
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
  window.location.href = '/login';
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    console.log('현재 사용자 정보:', response.data);
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