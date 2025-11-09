import { useState, useMemo } from 'react';
import { useDebouncedValue } from '@/hooks/useDebounce';

export const useUserTableSearch = (rows) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // 검색어 디바운싱 (300ms 지연)
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const filteredRows = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return rows;
    
    return rows.filter(row => {
      const email = row.email || '';
      const name = row.name || '';
      const searchLower = debouncedSearchQuery.toLowerCase();
      return email.toLowerCase().includes(searchLower) || 
             name.toLowerCase().includes(searchLower);
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

