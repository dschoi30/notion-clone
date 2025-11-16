import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * 데이터 페칭을 담당하는 커스텀 훅
 *
 * @param {string} url - API 엔드포인트
 * @param {Object} options - 추가 옵션
 * @param {boolean} options.skip - 요청 스킵 여부 (기본값: false)
 * @param {number} options.refetchInterval - 재요청 간격 (기본값: null)
 *
 * @returns {Object} { data, loading, error, refetch, reset }
 *
 * @example
 * const { data: documents, loading, error, refetch } = useFetch('/api/documents');
 */
export function useFetch(url, options = {}) {
  const { skip = false, refetchInterval = null } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // ========== Fetch Logic ==========
  const fetchData = useCallback(async () => {
    if (!url) return;

    try {
      setLoading(true);
      setError(null);

      // 이전 요청 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // 새 AbortController 생성
      abortControllerRef.current = new AbortController();

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
          // Authorization 헤더는 필요에 따라 추가
          // Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      // AbortError는 무시 (요청 취소)
      if (err.name !== 'AbortError') {
        setError(err);
        console.error(`Failed to fetch ${url}:`, err);
      }
    } finally {
      setLoading(false);
    }
  }, [url]);

  // ========== Effects ==========
  // 초기 데이터 로드
  useEffect(() => {
    if (skip) return;

    fetchData();
  }, [url, skip, fetchData]);

  // 자동 재요청
  useEffect(() => {
    if (!refetchInterval || skip) return;

    const interval = setInterval(fetchData, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, skip, fetchData]);

  // 언마운트 시 요청 취소
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ========== Handlers ==========
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    reset,
  };
}

/**
 * 폼 상태 관리 커스텀 훅
 *
 * @param {Object} initialValues - 초기값
 * @param {Function} onSubmit - 제출 콜백
 *
 * @returns {Object} { values, errors, touched, handleChange, handleBlur, handleSubmit, setFieldValue, setFieldError }
 *
 * @example
 * const form = useForm(
 *   { name: '', email: '' },
 *   (values) => api.createUser(values)
 * );
 */
export function useForm(initialValues, onSubmit) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ========== Handlers ==========
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setValues((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // 필드 터치 시 에러 제거
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  }, [errors]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      try {
        setIsSubmitting(true);
        await onSubmit(values);
      } catch (err) {
        // 에러 처리
        if (err.fieldErrors) {
          setErrors(err.fieldErrors);
        } else {
          console.error('Form submission error:', err);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, onSubmit]
  );

  // ========== Helpers ==========
  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const setFieldError = useCallback((name, error) => {
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    reset,
  };
}

/**
 * 로컬 스토리지 동기화 커스텀 훅
 *
 * @param {string} key - 스토리지 키
 * @param {*} initialValue - 초기값
 *
 * @returns {[*, Function]} - [값, 설정 함수]
 *
 * @example
 * const [theme, setTheme] = useLocalStorage('theme', 'light');
 */
export function useLocalStorage(key, initialValue) {
  // 초기 상태를 스토리지에서 가져오기
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // 상태 업데이트 및 스토리지 동기화
  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error writing to localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

/**
 * 디바운스 커스텀 훅
 *
 * @param {Function} callback - 실행할 함수
 * @param {number} delay - 디바운스 딜레이 (밀리초)
 *
 * @returns {Function} - 디바운스된 함수
 *
 * @example
 * const debouncedSearch = useDebounce((query) => api.search(query), 300);
 */
export function useDebounce(callback, delay) {
  const timeoutRef = useRef(null);

  return useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * 이전 값 추적 커스텀 훅
 *
 * @param {*} value - 추적할 값
 *
 * @returns {*} - 이전 값
 *
 * @example
 * const prevCount = usePrevious(count);
 */
export function usePrevious(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * 마운트 상태 추적 커스텀 훅
 *
 * @returns {boolean} - 마운트 여부
 *
 * @example
 * const isMounted = useIsMounted();
 * useEffect(() => {
 *   setTimeout(() => {
 *     if (isMounted) {
 *       setState(newValue);
 *     }
 *   }, 1000);
 * }, [isMounted]);
 */
export function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}
