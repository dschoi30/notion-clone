import { useState, useCallback } from 'react';
import { useToast } from './useToast';
import { getErrorMessageFromError } from '@/lib/errorUtils';
import { createLogger } from '@/lib/logger';

const log = createLogger('useErrorHandler');

export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const handleError = useCallback((error, options = {}) => {
    const {
      showToast = true,
      showDetails = false,
      customMessage = null,
      onError = null
    } = options;

    log.error('Error handled', error);

    // 에러 상태 설정
    setError(error);

    // 커스텀 에러 처리 함수 실행
    if (onError) {
      onError(error);
    }

    // Toast 메시지 표시
    if (showToast) {
      const message = customMessage || getErrorMessage(error);
      toast({
        title: "오류 발생",
        description: message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 에러 메시지 변환 로직은 별도 유틸 함수로 분리
  const getErrorMessage = (error) => {
    return getErrorMessageFromError(error);
  };

  return {
    error,
    handleError,
    clearError,
    getErrorMessage
  };
};

// 특정 에러 타입별 처리 함수들 (필요시 확장 가능)
export const createErrorHandler = (errorType) => {
  const handlers = {
    // 403 에러 처리
    forbidden: (error, context) => {
      log.warn('403 Forbidden', error);
      return {
        message: '접근 권한이 없습니다. 관리자에게 문의하거나 다른 문서를 확인해주세요.',
        action: '권한 확인',
        severity: 'warning'
      };
    },

    // 500 에러 처리
    serverError: (error, context) => {
      log.error('500 Server Error', error);
      return {
        message: '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
        action: '다시 시도',
        severity: 'error'
      };
    },

    // 네트워크 에러 처리
    networkError: (error, context) => {
      log.error('Network Error', error);
      return {
        message: '네트워크 연결을 확인해주세요.',
        action: '연결 확인',
        severity: 'error'
      };
    },

    // 기본 에러 처리
    default: (error, context) => {
      log.error('Default Error', error);
      return {
        message: '예상치 못한 오류가 발생했습니다.',
        action: '다시 시도',
        severity: 'error'
      };
    }
  };

  return handlers[errorType] || handlers.default;
};
