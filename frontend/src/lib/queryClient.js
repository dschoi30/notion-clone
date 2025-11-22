// src/lib/queryClient.js
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분 - 데이터가 "신선한" 상태로 유지되는 시간
      gcTime: 1000 * 60 * 30, // 30분 - 사용하지 않는 쿼리가 메모리에 유지되는 시간 (v5에서 cacheTime → gcTime으로 변경)
      retry: 1, // 실패 시 1번 재시도
      refetchOnWindowFocus: true, // 포커스 복귀 시 자동 리페칭
      refetchOnReconnect: true, // 네트워크 재연결 시 자동 리페칭
    },
    mutations: {
      retry: 0, // mutation은 재시도하지 않음
    },
  },
});

