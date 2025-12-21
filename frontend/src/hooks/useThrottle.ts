import { useRef, useCallback, useEffect } from 'react';

/**
 * 쓰로틀링 훅 - 지정된 시간 간격으로 함수 실행을 제한
 * @param callback - 실행할 함수
 * @param delay - 지연 시간 (ms)
 * @returns 쓰로틀링된 함수
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastRun = useRef<number>(Date.now());
  const callbackRef = useRef<T>(callback);

  // callback이 변경될 때마다 ref 업데이트
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      if (Date.now() - lastRun.current >= delay) {
        callbackRef.current(...args);
        lastRun.current = Date.now();
      }
    },
    [delay]
  );
}

interface UseThrottleAdvancedOptions {
  leading?: boolean;
  trailing?: boolean;
}

/**
 * 쓰로틀링 훅 (고급) - 리드/트레일링 옵션 지원
 * @param callback - 실행할 함수
 * @param delay - 지연 시간 (ms)
 * @param options - 옵션
 * @param options.leading - 첫 번째 호출 즉시 실행
 * @param options.trailing - 마지막 호출 지연 실행
 * @returns 쓰로틀링된 함수
 */
export function useThrottleAdvanced<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: UseThrottleAdvancedOptions = {}
): (...args: Parameters<T>) => void {
  const { leading = true, trailing = true } = options;
  const lastRun = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgs = useRef<Parameters<T> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun.current;

      lastArgs.current = args;

      if (timeSinceLastRun >= delay) {
        // 즉시 실행
        if (leading) {
          callback(...args);
          lastRun.current = now;
        }
      } else if (trailing) {
        // 지연 실행
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          if (lastArgs.current) {
            callback(...lastArgs.current);
            lastRun.current = Date.now();
          }
        }, delay - timeSinceLastRun);
      }
    },
    [callback, delay, leading, trailing]
  );
}

export default useThrottle;

