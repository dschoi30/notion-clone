import api from './api';

export const login = async (data) => {
  const response = await api.post('/auth/login', data);
  if (response.data.accessToken) {
    localStorage.setItem('token', response.data.accessToken);
  }
  return response.data;
};

export const register = async (data) => {
  const response = await api.post('/auth/register', data);
  if (response.data.accessToken) {
    localStorage.setItem('token', response.data.accessToken);
  }
  return response.data;
};

export const loginWithGoogle = async (credential) => {
  const response = await api.post('/auth/google', { credential });
  if (response.data.accessToken) {
    localStorage.setItem('token', response.data.accessToken);
  }
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    localStorage.removeItem('token');
    throw error;
  }
};

export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
}; 