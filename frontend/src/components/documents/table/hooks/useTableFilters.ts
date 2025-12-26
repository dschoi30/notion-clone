import { useState, useMemo } from 'react';
import type { TableRowData } from '@/components/documents/shared/constants';

interface Filter {
  id: string;
  propertyId: number | 'title';
  operator: 'contains' | 'equals' | 'not_equals';
  value: string;
}

export const useTableFilters = (rows: TableRowData[]) => {
  const [activeFilters, setActiveFilters] = useState<Filter[]>([]);

  const addFilter = (property: { id: number; name: string; type: string }) => {
    // 필터 추가 로직 - 나중에 모달로 확장
    console.log('Adding filter for property:', property);
    // TODO: 필터 모달 열기
  };

  const removeFilter = (filterId: string) => {
    setActiveFilters(prev => prev.filter(filter => filter.id !== filterId));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  const filteredRows = useMemo<TableRowData[]>(() => {
    if (activeFilters.length === 0) return rows;
    
    return rows.filter(row => {
      return activeFilters.every(filter => {
        const value = filter.propertyId === 'title' 
          ? row.title 
          : row.values?.[filter.propertyId];
        
        // 필터 조건에 따른 로직
        switch (filter.operator) {
          case 'contains':
            return String(value || '').toLowerCase().includes(String(filter.value || '').toLowerCase());
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

