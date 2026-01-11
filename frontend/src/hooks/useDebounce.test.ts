import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDebounce, useDebouncedValue, useDebounceAdvanced } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('함수 호출을 디바운싱한다', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 500));

    result.current('arg1');
    result.current('arg2');
    result.current('arg3');

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    // waitFor 대신 직접 확인
    await vi.runAllTimersAsync();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('arg3');
  });

  it('연속된 호출 중 마지막 호출만 실행된다', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 300));

    result.current('first');
    vi.advanceTimersByTime(200);
    result.current('second');
    vi.advanceTimersByTime(200);
    result.current('third');

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('third');
  });

  it('컴포넌트 언마운트 시 타이머를 정리한다', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useDebounce(callback, 500));

    result.current('test');
    unmount();

    vi.advanceTimersByTime(500);

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('useDebounceAdvanced', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('immediate 옵션이 true이면 첫 호출을 즉시 실행한다', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebounceAdvanced(callback, 500, { immediate: true })
    );

    result.current('first');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('first');

    result.current('second');
    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('second');
  });

  it('immediate 옵션이 false이면 일반 디바운싱과 동일하게 동작한다', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebounceAdvanced(callback, 500, { immediate: false })
    );

    result.current('test');

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('값 변경을 디바운싱한다', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 500 });
    expect(result.current).toBe('initial'); // 아직 업데이트 안됨

    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    expect(result.current).toBe('updated');
  });

  it('연속된 값 변경 중 마지막 값만 반영된다', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: 'first', delay: 300 },
      }
    );

    rerender({ value: 'second', delay: 300 });
    vi.advanceTimersByTime(200);
    rerender({ value: 'third', delay: 300 });
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();

    expect(result.current).toBe('third');
  });
});

