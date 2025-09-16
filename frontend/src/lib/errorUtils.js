// 에러 처리 관련 유틸리티 함수들

/**
 * 에러 객체를 사용자 친화적인 메시지로 변환
 * @param {Error|Object} error - 에러 객체
 * @returns {string} 사용자 친화적인 에러 메시지
 */
export const getErrorMessageFromError = (error) => {
  if (!error) return '알 수 없는 오류가 발생했습니다.';
  
  // HTTP 상태 코드별 메시지
  if (error.response?.status) {
    switch (error.response.status) {
      case 400:
        return '잘못된 요청입니다. 입력한 정보를 확인해주세요.';
      case 401:
        return '로그인이 필요합니다. 다시 로그인해주세요.';
      case 403:
        return '접근 권한이 없습니다. 관리자에게 문의해주세요.';
      case 404:
        return '요청한 리소스를 찾을 수 없습니다.';
      case 409:
        return '이미 존재하는 데이터입니다.';
      case 422:
        return '입력한 데이터에 오류가 있습니다.';
      case 429:
        return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
      case 500:
        return '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      case 502:
      case 503:
      case 504:
        return '서버가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.';
      default:
        return `서버 오류가 발생했습니다. (${error.response.status})`;
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
    return '서버 문제로 인한 오류입니다. 잠시 후 다시 시도해주세요.';
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
