// services/api.js
import axios from 'axios';
import { authSync } from '@/utils/authSync';
import { getToastMessageFromError } from '@/lib/errorUtils';
import { createLogger } from '@/lib/logger';
const alog = createLogger('api');

// Toast 메시지를 위한 전역 함수
let globalToast = null;

export const setGlobalToast = (toastFn) => {
  globalToast = toastFn;
};

// 토큰 제거 공통 함수
const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  localStorage.removeItem('userId');
};

// 인증 실패 공통 처리 함수
const handleAuthFailure = (error, reason = 'TOKEN_EXPIRED') => {
  alog.info(`${error.response?.status} 에러 발생 - ${reason} 처리 시작`);
  
  // 현재 사용자 ID 저장
  const currentUserId = localStorage.getItem('userId');
  alog.debug('현재 사용자 ID:', currentUserId);
  
  // 다른 탭에 인증 실패 알림 (현재는 비활성화)
  // authSync.notifyLogout(reason, currentUserId);
  alog.debug(`${error.response?.status} 에러 - authSync 알림 비활성화`);
  
  // 토큰 제거
  clearTokens();
  
  // Toast 메시지 표시
  const toastMessage = getToastMessageFromError(error);
  alog.debug('Toast 메시지:', toastMessage);
  if (globalToast) {
    globalToast(toastMessage);
    alog.debug('Toast 메시지 표시됨');
  } else {
    alog.debug('globalToast가 설정되지 않음');
  }
  
  // Toast 메시지 표시 후 리다이렉트 (1.5초 후)
  setTimeout(() => {
    alog.debug('리다이렉트 실행');
    window.location.href = '/login';
  }, 1500);
};

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
    const currentUserId = localStorage.getItem('userId');
    let token = null;
    
    alog.debug('API 요청 - 현재 사용자 ID:', currentUserId);
    
    // 기존 방식 사용
    token = localStorage.getItem('accessToken');

    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`
      };
      alog.debug('토큰 설정 완료');
    } else {
      alog.debug('토큰 없음 - 인증되지 않은 요청');
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
      handleAuthFailure(error, 'TOKEN_EXPIRED');
    }
    
    // 403 Forbidden - 권한 없음 (토큰은 유효하지만 접근 권한이 없는 경우)
    // 인증 실패가 아닌 권한 부족이므로, 각 컴포넌트에서 적절히 처리하도록 에러만 전달
    // 특정 엔드포인트(예: 워크스페이스 접근)에서 권한이 없는 것은 정상적인 상황일 수 있음
    if (error.response?.status === 403) {
      alog.debug('403 Forbidden - 권한 없음:', {
        url: error.config?.url,
        method: error.config?.method,
      });
      // 에러를 그대로 전달하여 각 컴포넌트에서 처리하도록 함
      return Promise.reject(error);
    }
    
    // 500+ 서버 에러
    // 백엔드에서 이미 로그를 남기므로, 프론트엔드에서는 로그만 남기고
    // Grafana Loki + Promtail을 통해 백엔드 로그를 수집하는 것을 권장합니다.
    if (error.response?.status >= 500) {
      console.error('Server Error:', error.response.status, error.response.data);
      alog.error('서버 에러 발생', {
        status: error.response.status,
        url: error.config?.url,
        method: error.config?.method,
        responseData: error.response.data,
      });
      
      // 참고: 백엔드 로그는 Grafana Loki + Promtail로 수집됩니다.
      // 프론트엔드 Sentry는 클라이언트 사이드 에러에만 집중합니다.
    }
    
    // 429 Too Many Requests - Rate Limiting 이슈 추적
    if (error.response?.status === 429) {
      if (typeof window !== 'undefined' && window.Sentry) {
        try {
          window.Sentry.captureMessage('Rate limit exceeded', {
            level: 'warning',
            tags: {
              endpoint: error.config?.url || 'unknown',
              retry_after: error.response.headers['retry-after'] || 'unknown',
            },
          });
        } catch (sentryError) {
          console.error('Sentry capture failed:', sentryError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;