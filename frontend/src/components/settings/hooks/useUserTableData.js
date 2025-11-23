import { useState, useCallback, useMemo, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getUsersPaged } from '@/services/userApi';
import { createLogger } from '@/lib/logger';
import { useErrorHandler } from '@/hooks/useErrorHandler';

const log = createLogger('useUserTableData');

export function useUserTableData() {
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const { handleError } = useErrorHandler();

  // React Query useInfiniteQuery로 무한 스크롤 페이지네이션 구현
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['users', sortField, sortDir],
    queryFn: async ({ pageParam = 0 }) => {
      const sort = `${sortField},${sortDir}`;
      const response = await getUsersPaged(pageParam, 50, sortField, sortDir);
      
      // 사용자 데이터를 테이블 행 형식으로 변환
      const tableRows = (response?.content || []).map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        isActive: user.isActive !== undefined ? user.isActive : true,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        updatedAt: user.updatedAt,
      }));
      
      return {
        rows: tableRows,
        page: response?.number || pageParam,
        totalPages: response?.totalPages || 0,
        hasMore: (response?.number || 0) + 1 < (response?.totalPages || 0),
      };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 2, // 2분
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (error) {
      log.error('사용자 목록 조회 실패', error);
      handleError(error, {
        customMessage: '사용자 목록을 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [error, handleError]);

  // 모든 페이지의 rows를 하나의 배열로 합치기
  const rows = useMemo(() => {
    return data?.pages.flatMap((page) => page.rows) || [];
  }, [data]);

  // 정렬 파라미터 업데이트 함수
  const updateSortParams = useCallback((field, dir) => {
    setSortField(field);
    setSortDir(dir);
  }, []);

  // setRows는 로컬 상태 업데이트용 (기존 API 호환성)
  const setRows = useCallback((updater) => {
    // React Query 캐시는 자동으로 관리되므로 여기서는 빈 함수
    // 필요시 queryClient.setQueryData를 사용하여 직접 업데이트 가능
    log.warn('setRows는 React Query로 관리되므로 직접 호출하지 마세요.');
  }, []);

  return {
    rows,
    setRows,
    isLoading,
    isFetchingMore: isFetchingNextPage,
    hasMore: hasNextPage ?? false,
    fetchNextPage,
    error: error?.message || null,
    sortField,
    sortDir,
    updateSortParams,
    refetch,
    fetchTableData: refetch,
  };
}

