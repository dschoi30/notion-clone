import { useRef, useCallback, useEffect } from 'react';

/**
 * 쓰로틀링 훅 - 지정된 시간 간격으로 함수 실행을 제한
 * @param {Function} callback - 실행할 함수
 * @param {number} delay - 지연 시간 (ms)
 * @returns {Function} 쓰로틀링된 함수
 */
export function useThrottle(callback, delay) {
  const lastRun = useRef(Date.now());
  const callbackRef = useRef(callback);

  // callback이 변경될 때마다 ref 업데이트
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args) => {
    if (Date.now() - lastRun.current >= delay) {
      callbackRef.current(...args);
      lastRun.current = Date.now();
    }
  }, [delay]);
}

/**
 * 쓰로틀링 훅 (고급) - 리드/트레일링 옵션 지원
 * @param {Function} callback - 실행할 함수
 * @param {number} delay - 지연 시간 (ms)
 * @param {Object} options - 옵션
 * @param {boolean} options.leading - 첫 번째 호출 즉시 실행
 * @param {boolean} options.trailing - 마지막 호출 지연 실행
 * @returns {Function} 쓰로틀링된 함수
 */
export function useThrottleAdvanced(callback, delay, options = {}) {
  const { leading = true, trailing = true } = options;
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef(null);
  const lastArgs = useRef(null);

  return useCallback((...args) => {
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
        callback(...lastArgs.current);
        lastRun.current = Date.now();
      }, delay - timeSinceLastRun);
    }
  }, [callback, delay, leading, trailing]);
}

export default useThrottle;
