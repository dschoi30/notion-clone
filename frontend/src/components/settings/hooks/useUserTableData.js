import { useEffect, useState, useMemo, useCallback } from 'react';
import { getUsersPaged } from '@/services/userApi';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export function useUserTableData() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState(null);
  const [nextPage, setNextPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const { handleError } = useErrorHandler();

  // 서버 정렬 파라미터 계산
  const getServerSortParams = useCallback(() => {
    return { sortField, sortDir };
  }, [sortField, sortDir]);

  // 최초 로드: 첫 페이지(50)
  async function fetchTableData() {
    setIsLoading(true);
    setError(null);
    try {
      const { sortField: sf, sortDir: sd } = getServerSortParams();
      const page0 = await getUsersPaged(0, 50, sf, sd);
      const users = page0?.content || [];
      setRows([]);
      if (!users || users.length === 0) {
        setRows([]);
        return;
      }
      const tableRows = users.map((user) => ({
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
      setRows(tableRows);
      setNextPage(1);
      setHasMore((page0?.number + 1) < (page0?.totalPages || 0));
    } catch (err) {
      setError(err);
      console.error('사용자 테이블 데이터 로딩 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const fetchNextPage = useCallback(async () => {
    if (isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    try {
      const { sortField: sf, sortDir: sd } = getServerSortParams();
      const pageResp = await getUsersPaged(nextPage, 50, sf, sd);
      const users = pageResp?.content || [];
      if (users.length === 0) {
        setHasMore(false);
        return;
      }
      const pageRows = users.map((user) => ({
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
      setRows((prev) => [...prev, ...pageRows]);
      const newPage = (pageResp?.number || nextPage) + 1;
      setNextPage(newPage);
      setHasMore(newPage < (pageResp?.totalPages || 0));
    } catch (e) {
      console.error('다음 페이지 로드 실패:', e);
      setHasMore(false);
    } finally {
      setIsFetchingMore(false);
    }
  }, [nextPage, hasMore, isFetchingMore, getServerSortParams]);

  // 정렬 변경 시 데이터 다시 로드
  useEffect(() => {
    fetchTableData();
  }, [sortField, sortDir]);

  // 정렬 파라미터 업데이트 함수
  const updateSortParams = useCallback((field, dir) => {
    setSortField(field);
    setSortDir(dir);
    setNextPage(0);
    setHasMore(true);
  }, []);

  return {
    rows,
    setRows,
    isLoading,
    isFetchingMore,
    hasMore,
    fetchNextPage,
    error,
    sortField,
    sortDir,
    updateSortParams,
    refetch: fetchTableData,
    fetchTableData,
  };
}

