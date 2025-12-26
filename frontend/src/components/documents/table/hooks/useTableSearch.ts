import { useState, useMemo } from 'react';
import { useDebouncedValue } from '@/hooks/useDebounce';
import type { TableRowData } from '@/components/documents/shared/constants';

export const useTableSearch = (rows: TableRowData[]) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // 검색어 디바운싱 (300ms 지연)
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const filteredRows = useMemo<TableRowData[]>(() => {
    if (!debouncedSearchQuery.trim()) return rows;
    
    return rows.filter(row => {
      const title = row.title || '';
      return title.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    });
  }, [rows, debouncedSearchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  return {
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    setIsSearchOpen,
    filteredRows,
    clearSearch,
    hasActiveSearch: searchQuery.trim().length > 0
  };
};

