// services/api.js
import axios from 'axios';

const resolvedBaseURL = (() => {
  const envBase = import.meta.env?.VITE_API_BASE_URL;
  if (!envBase || envBase === '/api') {
    return 'http://localhost:8080';
  }
  return envBase;
})();

const api = axios.create({
  baseURL: resolvedBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`
      };
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.error('Response error:', error.response);
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;