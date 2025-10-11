import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * 디바운싱 훅 - 연속된 호출을 지연시켜 마지막 호출만 실행
 * @param {Function} callback - 실행할 함수
 * @param {number} delay - 지연 시간 (ms)
 * @param {Array} deps - 의존성 배열
 * @returns {Function} 디바운싱된 함수
 */
export function useDebounce(callback, delay, deps = []) {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay, ...deps]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * 디바운싱 훅 (고급) - 즉시 실행 옵션 지원
 * @param {Function} callback - 실행할 함수
 * @param {number} delay - 지연 시간 (ms)
 * @param {Object} options - 옵션
 * @param {boolean} options.immediate - 첫 번째 호출 즉시 실행
 * @param {Array} deps - 의존성 배열
 * @returns {Function} 디바운싱된 함수
 */
export function useDebounceAdvanced(callback, delay, options = {}, deps = []) {
  const { immediate = false } = options;
  const timeoutRef = useRef(null);
  const hasBeenCalled = useRef(false);

  const debouncedCallback = useCallback((...args) => {
    const callNow = immediate && !hasBeenCalled.current;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (callNow) {
      callback(...args);
      hasBeenCalled.current = true;
    } else {
      timeoutRef.current = setTimeout(() => {
        callback(...args);
        hasBeenCalled.current = true;
      }, delay);
    }
  }, [callback, delay, immediate, ...deps]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * 디바운싱된 값 훅 - 값 변경을 디바운싱
 * @param {any} value - 디바운싱할 값
 * @param {number} delay - 지연 시간 (ms)
 * @returns {any} 디바운싱된 값
 */
export function useDebouncedValue(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
