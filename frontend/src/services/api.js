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
    
    // 401 Unauthorized - 토큰 만료 또는 인증 실패
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      // 로그인 페이지로 리다이렉트 (필요시 주석 해제)
      // window.location.href = '/login';
    }
    
    // 403 Forbidden - 권한 없음 (토큰은 유효하지만 접근 권한 없음)
    if (error.response?.status === 403) {
      // 403은 토큰을 제거하지 않음 (권한 문제이므로)
      console.warn('403 Forbidden - 권한이 없습니다:', error.response.data);
    }
    
    // 500+ 서버 에러
    if (error.response?.status >= 500) {
      console.error('Server Error:', error.response.status, error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export default api;