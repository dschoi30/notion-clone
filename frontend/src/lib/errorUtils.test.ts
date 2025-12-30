import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getToastMessageFromError,
  getErrorMessageFromError,
  getReactErrorMessage,
  isSessionExpiredError,
  getErrorType,
  getErrorSeverity,
  isRetryable,
  getRetryMessage,
  ERROR_TYPES,
} from './errorUtils';

describe('errorUtils', () => {
  beforeEach(() => {
    // localStorage 초기화
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('getToastMessageFromError', () => {
    it('null이나 undefined를 처리한다', () => {
      const result1 = getToastMessageFromError(null);
      const result2 = getToastMessageFromError(undefined);
      
      expect(result1.title).toBe('오류 발생');
      expect(result1.variant).toBe('destructive');
      expect(result2.title).toBe('오류 발생');
    });

    it('일반 객체 에러를 처리한다', () => {
      const error = { message: 'Test error' };
      const result = getToastMessageFromError(error);
      
      expect(result.title).toBe('오류 발생');
      expect(result.variant).toBe('destructive');
    });

    it('400 에러를 올바르게 처리한다', () => {
      const error = {
        response: { status: 400 },
      };
      const result = getToastMessageFromError(error);
      
      expect(result.title).toBe('입력 오류');
      expect(result.description).toBe('입력한 정보를 다시 확인해주세요.');
    });

    it('401 에러를 올바르게 처리한다', () => {
      const error = {
        response: { status: 401 },
      };
      const result = getToastMessageFromError(error);
      
      expect(result.title).toBe('세션 만료');
      expect(result.description).toContain('로그인');
    });

    it('403 에러를 올바르게 처리한다', () => {
      const error = {
        response: { status: 403 },
      };
      const result = getToastMessageFromError(error);
      
      expect(result.title).toBe('접근 권한 없음');
    });

    it('404 에러를 올바르게 처리한다', () => {
      const error = {
        response: { status: 404 },
      };
      const result = getToastMessageFromError(error);
      
      expect(result.title).toBe('페이지를 찾을 수 없음');
    });

    it('500 에러를 올바르게 처리한다', () => {
      const error = {
        response: { status: 500 },
      };
      const result = getToastMessageFromError(error);
      
      expect(result.title).toBe('서버 오류');
    });

    it('네트워크 에러를 올바르게 처리한다', () => {
      const error = {
        code: 'NETWORK_ERROR',
      };
      const result = getToastMessageFromError(error);
      
      expect(result.title).toBe('네트워크 오류');
      expect(result.description).toContain('네트워크 연결');
    });

    it('타임아웃 에러를 올바르게 처리한다', () => {
      const error = {
        code: 'TIMEOUT',
      };
      const result = getToastMessageFromError(error);
      
      expect(result.title).toBe('요청 시간 초과');
    });
  });

  describe('getErrorMessageFromError', () => {
    it('null이나 undefined를 처리한다', () => {
      expect(getErrorMessageFromError(null)).toBe('알 수 없는 오류가 발생했습니다.');
      expect(getErrorMessageFromError(undefined)).toBe('알 수 없는 오류가 발생했습니다.');
    });

    it('400 에러 메시지를 반환한다', () => {
      const error = { response: { status: 400 } };
      expect(getErrorMessageFromError(error)).toBe('입력한 정보를 다시 확인해주세요.');
    });

    it('401 에러 메시지를 반환한다', () => {
      const error = { response: { status: 401 } };
      expect(getErrorMessageFromError(error)).toContain('로그인');
    });

    it('네트워크 에러 메시지를 반환한다', () => {
      const error = { code: 'NETWORK_ERROR' };
      expect(getErrorMessageFromError(error)).toBe('네트워크 연결을 확인해주세요.');
    });

    it('에러 메시지가 있으면 반환한다', () => {
      const error = { message: 'Custom error message' };
      expect(getErrorMessageFromError(error)).toBe('Custom error message');
    });
  });

  describe('getReactErrorMessage', () => {
    it('세션 만료 에러를 처리한다', () => {
      // 토큰이 없으면 세션 만료로 간주
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      
      const error = { message: 'session expired' };
      const result = getReactErrorMessage(error);
      
      expect(result.title).toContain('세션');
      expect(result.shouldRedirect).toBe(true);
    });

    it('ChunkLoadError를 처리한다', () => {
      // 토큰을 설정하여 세션 만료 체크를 우회
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('user', '{}');
      
      const error = { name: 'ChunkLoadError' };
      const result = getReactErrorMessage(error);
      
      expect(result.title).toContain('페이지 로딩');
    });

    it('NetworkError를 처리한다', () => {
      // 토큰을 설정하여 세션 만료 체크를 우회
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('user', '{}');
      
      const error = { name: 'NetworkError' };
      const result = getReactErrorMessage(error);
      
      expect(result.title).toContain('네트워크');
    });

    it('알 수 없는 에러를 처리한다', () => {
      // 토큰을 설정하여 세션 만료 체크를 우회
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('user', '{}');
      
      const error = { name: 'UnknownError' };
      const result = getReactErrorMessage(error);
      
      expect(result.title).toContain('알 수 없는');
    });
  });

  describe('isSessionExpiredError', () => {
    it('토큰이 없으면 세션 만료로 간주한다', () => {
      localStorage.removeItem('accessToken');
      const error = { message: 'test' };
      
      expect(isSessionExpiredError(error)).toBe(true);
    });

    it('토큰이 있으면 세션 만료가 아니다', () => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('user', '{}');
      const error = { message: 'test' };
      
      expect(isSessionExpiredError(error)).toBe(false);
    });

    it('세션 관련 키워드가 있으면 세션 만료로 간주한다', () => {
      localStorage.setItem('accessToken', 'token');
      const error = { message: 'session expired' };
      
      expect(isSessionExpiredError(error)).toBe(true);
    });
  });

  describe('getErrorType', () => {
    it('네트워크 에러를 올바르게 분류한다', () => {
      const error = { code: 'NETWORK_ERROR' };
      expect(getErrorType(error)).toBe('network');
    });

    it('타임아웃 에러를 올바르게 분류한다', () => {
      const error = { code: 'TIMEOUT' };
      expect(getErrorType(error)).toBe('timeout');
    });

    it('서버 에러를 올바르게 분류한다', () => {
      const error = { response: { status: 500 } };
      expect(getErrorType(error)).toBe('server');
    });

    it('클라이언트 에러를 올바르게 분류한다', () => {
      const error = { response: { status: 400 } };
      expect(getErrorType(error)).toBe('client');
    });

    it('알 수 없는 에러를 올바르게 분류한다', () => {
      const error = { message: 'test' };
      expect(getErrorType(error)).toBe('unknown');
    });
  });

  describe('getErrorSeverity', () => {
    it('서버 에러는 높은 심각도를 반환한다', () => {
      const error = { response: { status: 500 } };
      expect(getErrorSeverity(error)).toBe('high');
    });

    it('인증 에러는 높은 심각도를 반환한다', () => {
      const error = { response: { status: 401 } };
      expect(getErrorSeverity(error)).toBe('high');
    });

    it('클라이언트 에러는 중간 심각도를 반환한다', () => {
      const error = { response: { status: 400 } };
      expect(getErrorSeverity(error)).toBe('medium');
    });

    it('네트워크 에러는 높은 심각도를 반환한다', () => {
      const error = { code: 'NETWORK_ERROR' };
      expect(getErrorSeverity(error)).toBe('high');
    });
  });

  describe('isRetryable', () => {
    it('서버 에러는 재시도 가능하다', () => {
      const error = { response: { status: 500 } };
      expect(isRetryable(error)).toBe(true);
    });

    it('네트워크 에러는 재시도 가능하다', () => {
      const error = { code: 'NETWORK_ERROR' };
      expect(isRetryable(error)).toBe(true);
    });

    it('타임아웃 에러는 재시도 가능하다', () => {
      const error = { code: 'TIMEOUT' };
      expect(isRetryable(error)).toBe(true);
    });

    it('429 에러는 재시도 가능하다', () => {
      const error = { response: { status: 429 } };
      expect(isRetryable(error)).toBe(true);
    });

    it('클라이언트 에러는 재시도 불가능하다', () => {
      const error = { response: { status: 400 } };
      expect(isRetryable(error)).toBe(false);
    });
  });

  describe('getRetryMessage', () => {
    it('서버 에러에 대한 재시도 메시지를 반환한다', () => {
      const error = { response: { status: 500 } };
      expect(getRetryMessage(error)).toContain('서버');
    });

    it('네트워크 에러에 대한 재시도 메시지를 반환한다', () => {
      const error = { code: 'NETWORK_ERROR' };
      expect(getRetryMessage(error)).toContain('네트워크');
    });

    it('타임아웃 에러에 대한 재시도 메시지를 반환한다', () => {
      const error = { code: 'TIMEOUT' };
      expect(getRetryMessage(error)).toContain('시간');
    });
  });
});

