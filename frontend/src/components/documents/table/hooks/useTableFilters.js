import { useState, useMemo } from 'react';

export const useTableFilters = (rows) => {
  const [activeFilters, setActiveFilters] = useState([]);

  const addFilter = (property) => {
    // 필터 추가 로직 - 나중에 모달로 확장
    console.log('Adding filter for property:', property);
    // TODO: 필터 모달 열기
  };

  const removeFilter = (filterId) => {
    setActiveFilters(prev => prev.filter(filter => filter.id !== filterId));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  const filteredRows = useMemo(() => {
    if (activeFilters.length === 0) return rows;
    
    return rows.filter(row => {
      return activeFilters.every(filter => {
        const value = filter.propertyId === 'title' 
          ? row.title 
          : row.values?.[filter.propertyId];
        
        // 필터 조건에 따른 로직
        switch (filter.operator) {
          case 'contains':
            return value?.toLowerCase().includes(filter.value.toLowerCase());
          case 'equals':
            return value === filter.value;
          case 'not_equals':
            return value !== filter.value;
          default:
            return true;
        }
      });
    });
  }, [rows, activeFilters]);

  return {
    activeFilters,
    addFilter,
    removeFilter,
    clearAllFilters,
    filteredRows,
    hasActiveFilters: activeFilters.length > 0
  };
};
