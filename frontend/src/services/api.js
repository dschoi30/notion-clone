// services/api.js
import axios from 'axios';

// 운영(Nginx) 및 개발(Vite proxy) 모두에서 '/' 상대 경로 사용을 우선
// 필요 시 VITE_API_BASE_URL로 오버라이드
const resolvedBaseURL = import.meta.env?.VITE_API_BASE_URL || '/';

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