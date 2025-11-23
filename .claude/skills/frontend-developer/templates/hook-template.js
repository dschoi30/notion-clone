import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { createLogger } from '@/lib/logger';

/**
 * React Query를 사용한 데이터 페칭 커스텀 훅
 *
 * @param {string|number} id - 리소스 ID 또는 식별자
 * @param {Object} options - 추가 옵션
 * @param {boolean} options.enabled - 쿼리 활성화 여부 (기본값: true)
 * @param {number} options.staleTime - 데이터 신선도 시간 (밀리초, 기본값: 5분)
 *
 * @returns {Object} { data, isLoading, error, refetch }
 *
 * @example
 * const { data: document, isLoading, error, refetch } = useDocumentQuery(documentId);
 */
export function useDocumentQuery(id, options = {}) {
  const { enabled = true, staleTime = 1000 * 60 * 5 } = options;
  const { handleError } = useErrorHandler();
  const log = createLogger('useDocumentQuery');

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['document', id],
    queryFn: () => documentApi.getDocument(id),
    enabled: !!id && enabled,
    staleTime,
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (error) {
      log.error('문서 조회 실패', error);
      handleError(error, {
        customMessage: '문서를 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [error, handleError, log]);

  return {
    data,
    isLoading,
    error: error?.message || null,
    refetch,
  };
}

/**
 * React Query를 사용한 데이터 변경 커스텀 훅
 *
 * @returns {Object} { mutate, mutateAsync, isPending, isError }
 *
 * @example
 * const { mutate: createDocument, isPending } = useCreateDocument();
 * createDocument({ title: 'New Document' });
 */
export function useCreateDocument() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const log = createLogger('useCreateDocument');

  const mutation = useMutation({
    mutationFn: (documentData) => documentApi.createDocument(documentData),
    onSuccess: (newDocument) => {
      // 캐시 무효화하여 자동 리페칭
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      // 또는 낙관적 업데이트
      // queryClient.setQueryData(['documents'], (old = []) => [...old, newDocument]);
    },
    onError: (e) => {
      log.error('문서 생성 실패', e);
      handleError(e, {
        customMessage: '문서 생성에 실패했습니다.',
        showToast: true
      });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}

/**
 * React Query를 사용한 무한 스크롤 페이지네이션 커스텀 훅
 *
 * @param {Object} options - 옵션
 * @param {number} options.pageSize - 페이지 크기 (기본값: 20)
 *
 * @returns {Object} { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage }
 *
 * @example
 * const { data, fetchNextPage, hasNextPage } = useInfiniteDocuments({ pageSize: 20 });
 * const documents = data?.pages.flatMap(page => page.content) || [];
 */
export function useInfiniteDocuments(options = {}) {
  const { pageSize = 20 } = options;
  const { handleError } = useErrorHandler();
  const log = createLogger('useInfiniteDocuments');

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteQuery({
    queryKey: ['documents', 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await documentApi.getDocumentsPaged(pageParam, pageSize);
      return {
        content: response.content,
        page: response.number,
        totalPages: response.totalPages,
        hasMore: !response.last,
      };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 2, // 2분
  });

  // 에러 처리
  useEffect(() => {
    if (error) {
      log.error('문서 목록 조회 실패', error);
      handleError(error, {
        customMessage: '문서 목록을 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [error, handleError, log]);

  return {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
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
          // 에러는 mutation의 onError에서 처리됨
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
      // localStorage 읽기 에러는 조용히 처리
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
        // localStorage 쓰기 에러는 조용히 처리
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
