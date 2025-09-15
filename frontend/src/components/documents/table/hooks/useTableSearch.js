import { useState, useMemo } from 'react';

export const useTableSearch = (rows) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    
    return rows.filter(row => {
      const title = row.title || '';
      return title.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [rows, searchQuery]);

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
