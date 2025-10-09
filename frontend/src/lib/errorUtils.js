// 에러 처리 관련 유틸리티 함수들
import { createLogger } from './logger';

const elog = createLogger('ErrorUtils');

/**
 * 에러 객체를 사용자 친화적인 메시지로 변환
 * @param {Error|Object} error - 에러 객체
 * @returns {string} 사용자 친화적인 에러 메시지
 */
/**
 * 에러 객체를 Toast 메시지 객체로 변환
 * @param {Error|Object} error - 에러 객체
 * @returns {Object} Toast 메시지 객체 { title, description, variant }
 */
export const getToastMessageFromError = (error) => {
  if (!error) {
    return {
      title: '오류 발생',
      description: '알 수 없는 오류가 발생했습니다.',
      variant: 'destructive'
    };
  }
  
  // HTTP 상태 코드별 메시지
  if (error.response?.status) {
    switch (error.response.status) {
      case 400:
        return {
          title: '입력 오류',
          description: '입력한 정보를 다시 확인해주세요.',
          variant: 'destructive'
        };
      case 401:
        return {
          title: '세션 만료',
          description: '로그인 시간이 만료되었습니다. 다시 로그인해주세요.',
          variant: 'destructive'
        };
      case 403:
        return {
          title: '접근 권한 없음',
          description: '해당 리소스에 접근할 권한이 없습니다.',
          variant: 'destructive'
        };
      case 404:
        return {
          title: '페이지를 찾을 수 없음',
          description: '요청한 페이지를 찾을 수 없습니다.',
          variant: 'destructive'
        };
      case 409:
        return {
          title: '중복 오류',
          description: '이미 사용 중인 정보입니다.',
          variant: 'destructive'
        };
      case 422:
        return {
          title: '입력 오류',
          description: '입력한 정보를 다시 확인해주세요.',
          variant: 'destructive'
        };
      case 429:
        return {
          title: '요청 제한',
          description: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
          variant: 'destructive'
        };
      case 500:
        return {
          title: '서버 오류',
          description: '일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
          variant: 'destructive'
        };
      case 502:
      case 503:
      case 504:
        return {
          title: '서비스 일시 중단',
          description: '서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.',
          variant: 'destructive'
        };
      default:
        return {
          title: '오류 발생',
          description: '일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
          variant: 'destructive'
        };
    }
  }
  
  // 네트워크 오류
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
    return {
      title: '네트워크 오류',
      description: '네트워크 연결을 확인해주세요.',
      variant: 'destructive'
    };
  }
  
  // 타임아웃 오류
  if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
    return {
      title: '요청 시간 초과',
      description: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
      variant: 'destructive'
    };
  }
  
  // 기본 에러 메시지
  return {
    title: '오류 발생',
    description: error.message || '일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    variant: 'destructive'
  };
};

export const getErrorMessageFromError = (error) => {
  if (!error) return '알 수 없는 오류가 발생했습니다.';
  
  // HTTP 상태 코드별 메시지
  if (error.response?.status) {
    switch (error.response.status) {
      case 400:
        return '입력한 정보를 다시 확인해주세요.';
      case 401:
        return '로그인 정보가 만료되었습니다. 다시 로그인해주세요.';
      case 403:
        return '로그인 세션이 만료되었습니다. 다시 로그인해주세요.';
      case 404:
        return '요청한 페이지를 찾을 수 없습니다.';
      case 409:
        return '이미 사용 중인 정보입니다.';
      case 422:
        return '입력한 정보를 다시 확인해주세요.';
      case 429:
        return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
      case 500:
        return '일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      case 502:
      case 503:
      case 504:
        return '서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.';
      default:
        return '일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
  }
  
  // 네트워크 오류
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
    return '네트워크 연결을 확인해주세요.';
  }
  
  // 타임아웃 오류
  if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
    return '요청 시간이 초과되었습니다. 다시 시도해주세요.';
  }
  
  // 기타 에러 메시지
  return error.message || '알 수 없는 오류가 발생했습니다.';
};

// 에러 타입 상수
export const ERROR_TYPES = {
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  DATA_ERROR: 'DATA_ERROR',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  CHUNK_LOAD_ERROR: 'CHUNK_LOAD_ERROR',
  SECURITY_ERROR: 'SECURITY_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

// 에러 메시지 템플릿
const ERROR_MESSAGES = {
  [ERROR_TYPES.SESSION_EXPIRED]: {
    title: '로그인 세션이 만료되었습니다',
    description: '다시 로그인해주세요. 잠시 후 로그인 페이지로 이동합니다.',
    shouldRedirect: true,
    redirectDelay: 2000
  },
  [ERROR_TYPES.NETWORK_ERROR]: {
    title: '네트워크 연결에 문제가 있습니다',
    description: '인터넷 연결을 확인하고 다시 시도해주세요.',
    shouldRedirect: false
  },
  [ERROR_TYPES.DATA_ERROR]: {
    title: '데이터 처리 중 오류가 발생했습니다',
    description: '데이터를 불러오는 중 문제가 발생했습니다. 페이지를 새로고침해주세요.',
    shouldRedirect: false
  },
  [ERROR_TYPES.SYSTEM_ERROR]: {
    title: '시스템 오류가 발생했습니다',
    description: '페이지를 새로고침하거나 잠시 후 다시 시도해주세요.',
    shouldRedirect: false
  },
  [ERROR_TYPES.CHUNK_LOAD_ERROR]: {
    title: '페이지 로딩 중 오류가 발생했습니다',
    description: '네트워크 연결을 확인하고 페이지를 새로고침해주세요.',
    shouldRedirect: false
  },
  [ERROR_TYPES.SECURITY_ERROR]: {
    title: '보안 오류가 발생했습니다',
    description: '브라우저를 새로고침하거나 다른 브라우저를 사용해보세요.',
    shouldRedirect: false
  },
  [ERROR_TYPES.UNKNOWN_ERROR]: {
    title: '알 수 없는 오류가 발생했습니다',
    description: '시스템에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    shouldRedirect: false
  }
};

/**
 * 안전한 localStorage 접근
 * @returns {Object} {token: string|null, user: string|null}
 */
const getStoredAuthData = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { token: null, user: null };
    }
    
    return {
      token: localStorage.getItem('accessToken'),
      user: localStorage.getItem('user')
    };
  } catch (error) {
    elog.warn('localStorage 접근 실패:', error);
    return { token: null, user: null };
  }
};

/**
 * 에러 타입 분류
 * @param {Error} error - 에러 객체
 * @returns {string} 에러 타입
 */
const classifyError = (error) => {
  if (!error) return ERROR_TYPES.UNKNOWN_ERROR;

  // 세션 만료 에러 우선 체크
  if (isSessionExpiredError(error)) {
    return ERROR_TYPES.SESSION_EXPIRED;
  }

  // 에러 이름별 분류
  switch (error.name) {
    case 'ChunkLoadError':
      return ERROR_TYPES.CHUNK_LOAD_ERROR;
    
    case 'TypeError':
      if (error.message?.includes('Cannot read properties') || 
          error.message?.includes('Cannot read property')) {
        return ERROR_TYPES.DATA_ERROR;
      }
      return ERROR_TYPES.SYSTEM_ERROR;
    
    case 'NetworkError':
      return ERROR_TYPES.NETWORK_ERROR;
    
    case 'SecurityError':
      return ERROR_TYPES.SECURITY_ERROR;
    
    case 'ReferenceError':
    case 'SyntaxError':
      return ERROR_TYPES.SYSTEM_ERROR;
    
    default:
      return ERROR_TYPES.UNKNOWN_ERROR;
  }
};

/**
 * React 에러 객체를 사용자 친화적인 메시지로 변환
 * @param {Error} error - React 에러 객체
 * @returns {Object} {title: string, description: string, shouldRedirect: boolean, redirectDelay?: number}
 */
export const getReactErrorMessage = (error) => {
  const errorType = classifyError(error);
  const message = ERROR_MESSAGES[errorType];
  
  if (!message) {
    return ERROR_MESSAGES[ERROR_TYPES.UNKNOWN_ERROR];
  }
  
  return message;
};

/**
 * 세션 만료 에러인지 확인
 * @param {Error} error - 에러 객체
 * @returns {boolean} 세션 만료 여부
 */
export const isSessionExpiredError = (error) => {
  try {
    // 안전한 localStorage 접근
    const { token, user } = getStoredAuthData();
    
    // 토큰이 없거나 사용자 정보가 없으면 세션 만료로 간주
    if (!token || !user) {
      return true;
    }
    
    // 에러 메시지에서 세션 관련 키워드 확인
    const sessionKeywords = [
      'session', 'token', 'auth', 'login', 'unauthorized', 'forbidden',
      '세션', '토큰', '인증', '로그인'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    const hasSessionKeyword = sessionKeywords.some(keyword => 
      errorMessage.includes(keyword)
    );
    
    // 스택 트레이스에서 API 호출 관련 에러 확인
    const stackTrace = error.stack?.toLowerCase() || '';
    const hasApiCall = stackTrace.includes('api') || stackTrace.includes('fetch') || 
                      stackTrace.includes('axios') || stackTrace.includes('request');
    
    return hasSessionKeyword || (hasApiCall && !token);
  } catch (error) {
    elog.warn('세션 만료 체크 실패:', error);
    return false;
  }
};

/**
 * 에러 타입을 판별
 * @param {Error|Object} error - 에러 객체
 * @returns {string} 에러 타입 ('network', 'timeout', 'server', 'client', 'unknown')
 */
export const getErrorType = (error) => {
  if (!error) return 'unknown';
  
  // 네트워크 오류
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
    return 'network';
  }
  
  // 타임아웃 오류
  if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
    return 'timeout';
  }
  
  // HTTP 상태 코드 기반 분류
  if (error.response?.status) {
    if (error.response.status >= 500) {
      return 'server';
    } else if (error.response.status >= 400) {
      return 'client';
    }
  }
  
  return 'unknown';
};

/**
 * 에러 심각도 판별
 * @param {Error|Object} error - 에러 객체
 * @returns {string} 심각도 ('low', 'medium', 'high', 'critical')
 */
export const getErrorSeverity = (error) => {
  if (!error) return 'medium';
  
  // 500+ 서버 에러는 높은 심각도
  if (error.response?.status >= 500) {
    return 'high';
  }
  
  // 401, 403 인증/권한 에러는 높은 심각도
  if (error.response?.status === 401 || error.response?.status === 403) {
    return 'high';
  }
  
  // 네트워크 오류는 높은 심각도
  if (getErrorType(error) === 'network') {
    return 'high';
  }
  
  // 4xx 클라이언트 에러는 중간 심각도
  if (error.response?.status >= 400) {
    return 'medium';
  }
  
  return 'low';
};

/**
 * 에러에 대한 재시도 가능 여부 판별
 * @param {Error|Object} error - 에러 객체
 * @returns {boolean} 재시도 가능 여부
 */
export const isRetryable = (error) => {
  if (!error) return false;
  
  // 500+ 서버 에러는 재시도 가능
  if (error.response?.status >= 500) {
    return true;
  }
  
  // 네트워크 오류는 재시도 가능
  if (getErrorType(error) === 'network') {
    return true;
  }
  
  // 타임아웃 오류는 재시도 가능
  if (getErrorType(error) === 'timeout') {
    return true;
  }
  
  // 429 Too Many Requests는 재시도 가능
  if (error.response?.status === 429) {
    return true;
  }
  
  return false;
};

/**
 * 에러에 대한 재시도 메시지 생성
 * @param {Error|Object} error - 에러 객체
 * @returns {string} 재시도 안내 메시지
 */
export const getRetryMessage = (error) => {
  if (!error) return '다시 시도해주세요.';
  
  if (error.response?.status >= 500) {
    return '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
  
  if (getErrorType(error) === 'network') {
    return '네트워크 연결을 확인하고 다시 시도해주세요.';
  }
  
  if (getErrorType(error) === 'timeout') {
    return '요청 시간이 초과되었습니다. 다시 시도해주세요.';
  }
  
  if (error.response?.status === 429) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  
  return '다시 시도해주세요.';
};
