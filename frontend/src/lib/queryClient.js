// src/lib/queryClient.js
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { createLogger } from './logger';

const log = createLogger('queryClient');

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // 전역 쿼리 에러 로깅
      // 개별 쿼리의 onError나 useEffect에서 이미 처리하므로 여기서는 로깅만 수행
      log.error('Query error', error, { queryKey: query.queryKey });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // 전역 mutation 에러 로깅
      // 개별 mutation의 onError에서 이미 처리하므로 여기서는 로깅만 수행
      log.error('Mutation error', error, { mutationKey: mutation.options.mutationKey });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분 - 데이터가 "신선한" 상태로 유지되는 시간
      gcTime: 1000 * 60 * 30, // 30분 - 사용하지 않는 쿼리가 메모리에 유지되는 시간 (v5에서 cacheTime → gcTime으로 변경)
      retry: (failureCount, error) => {
        // 4xx 클라이언트 에러는 재시도하지 않음
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // 서버 에러는 최대 2번까지 재시도
        return failureCount < 2;
      },
      refetchOnWindowFocus: true, // 포커스 복귀 시 자동 리페칭
      refetchOnReconnect: true, // 네트워크 재연결 시 자동 리페칭
    },
    mutations: {
      retry: 0, // mutation은 재시도하지 않음
    },
  },
});

