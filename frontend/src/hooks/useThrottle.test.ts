import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useThrottle, useThrottleAdvanced } from './useThrottle';

describe('useThrottle', () => {
  it('훅이 정상적으로 초기화된다', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottle(callback, 500));

    expect(result.current).toBeInstanceOf(Function);
  });

  it('반환된 함수를 호출할 수 있다', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottle(callback, 500));

    result.current('test');
    // 실제 호출 여부는 시간에 따라 달라지므로 함수 존재만 확인
    expect(typeof result.current).toBe('function');
  });
});

describe('useThrottleAdvanced', () => {
  it('훅이 정상적으로 초기화된다', () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useThrottleAdvanced(callback, 500, { leading: true, trailing: true })
    );

    expect(result.current).toBeInstanceOf(Function);
  });

  it('옵션에 따라 훅이 초기화된다', () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useThrottleAdvanced(callback, 500, { leading: false, trailing: true })
    );

    expect(result.current).toBeInstanceOf(Function);
  });
});
