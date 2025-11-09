import { useState, useMemo } from 'react';

export const useUserTableFilters = (rows) => {
  const [activeFilters, setActiveFilters] = useState([]);

  const addFilter = (property, operator, value) => {
    const newFilter = {
      id: `filter_${Date.now()}`,
      property,
      operator,
      value
    };
    setActiveFilters(prev => [...prev, newFilter]);
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
        let value;
        
        if (filter.property === 'role') {
          value = row.role;
        } else {
          value = row[filter.property];
        }
        
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

