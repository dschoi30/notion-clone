import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler, createErrorHandler } from './useErrorHandler';

// useToast 모킹
const mockToast = vi.fn();
vi.mock('./useToast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.mockClear();
  });

  it('훅이 정상적으로 초기화된다', () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('handleError');
    expect(result.current).toHaveProperty('clearError');
    expect(result.current).toHaveProperty('getErrorMessage');
  });

  it('초기 에러 상태는 null이다', () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(result.current.error).toBeNull();
  });

  it('handleError가 에러를 설정한다', () => {
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(result.current.error).toBe(testError);
  });

  it('handleError가 Toast를 표시한다', () => {
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: '오류 발생',
      description: expect.any(String),
      variant: 'destructive',
    });
  });

  it('showToast가 false이면 Toast를 표시하지 않는다', () => {
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error('Test error');
    mockToast.mockClear();

    act(() => {
      result.current.handleError(testError, { showToast: false });
    });

    expect(mockToast).not.toHaveBeenCalled();
  });

  it('customMessage가 있으면 커스텀 메시지를 사용한다', () => {
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError, {
        customMessage: '커스텀 에러 메시지',
      });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: '오류 발생',
      description: '커스텀 에러 메시지',
      variant: 'destructive',
    });
  });

  it('onError 콜백이 호출된다', () => {
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error('Test error');
    const onError = vi.fn();

    act(() => {
      result.current.handleError(testError, { onError });
    });

    expect(onError).toHaveBeenCalledWith(testError);
  });

  it('clearError가 에러를 제거한다', () => {
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('getErrorMessage가 에러 메시지를 반환한다', () => {
    const { result } = renderHook(() => useErrorHandler());
    const testError = { response: { status: 400 } };

    const message = result.current.getErrorMessage(testError);

    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });
});

describe('createErrorHandler', () => {
  it('forbidden 타입 핸들러를 생성한다', () => {
    const handler = createErrorHandler('forbidden');
    const result = handler(new Error('403'));

    expect(result.message).toContain('권한');
    expect(result.action).toBe('권한 확인');
    expect(result.severity).toBe('warning');
  });

  it('serverError 타입 핸들러를 생성한다', () => {
    const handler = createErrorHandler('serverError');
    const result = handler(new Error('500'));

    expect(result.message).toContain('서버');
    expect(result.action).toBe('다시 시도');
    expect(result.severity).toBe('error');
  });

  it('networkError 타입 핸들러를 생성한다', () => {
    const handler = createErrorHandler('networkError');
    const result = handler(new Error('Network'));

    expect(result.message).toContain('네트워크');
    expect(result.action).toBe('연결 확인');
    expect(result.severity).toBe('error');
  });

  it('default 타입 핸들러를 생성한다', () => {
    const handler = createErrorHandler('default');
    const result = handler(new Error('Unknown'));

    expect(result.message).toContain('오류');
    expect(result.action).toBe('다시 시도');
    expect(result.severity).toBe('error');
  });
});

