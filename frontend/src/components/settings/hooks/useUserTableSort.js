import { useState, useMemo } from 'react';

const useUserTableSort = (initialRows = [], updateSortParams) => {
  const [activeSorts, setActiveSorts] = useState([]);

  const addSort = (property, defaultOrder = 'asc') => {
    const newSort = {
      id: `sort_${Date.now()}`,
      propertyId: property.id,
      propertyName: property.name,
      propertyType: property.type,
      order: defaultOrder
    };
    
    setActiveSorts(prev => {
      // 중복 체크: 같은 속성이 이미 정렬에 있으면 추가하지 않음
      const exists = prev.some(sort => sort.propertyId === property.id);
      if (exists) return prev;
      
      // 새 정렬 추가
      const updated = [...prev, newSort];
      // 서버 사이드 정렬 업데이트 (첫 번째 정렬만 서버에서 처리)
      if (updateSortParams && updated.length > 0) {
        const firstSort = updated[0];
        updateSortParams(firstSort.propertyId, firstSort.order);
      }
      return updated;
    });
  };

  const updateSort = (sortId, updates) => {
    setActiveSorts(prev => {
      const updated = prev.map(sort => 
        sort.id === sortId ? { ...sort, ...updates } : sort
      );
      // 서버 사이드 정렬 업데이트 (첫 번째 정렬만 서버에서 처리)
      if (updateSortParams && updated.length > 0) {
        const firstSort = updated[0];
        updateSortParams(firstSort.propertyId, firstSort.order);
      }
      return updated;
    });
  };

  const removeSort = (sortId) => {
    setActiveSorts(prev => {
      const updated = prev.filter(sort => sort.id !== sortId);
      // 서버 사이드 정렬 업데이트
      if (updateSortParams && updated.length > 0) {
        const firstSort = updated[0];
        updateSortParams(firstSort.propertyId, firstSort.order);
      } else if (updateSortParams) {
        // 정렬이 없으면 기본값으로
        updateSortParams('id', 'asc');
      }
      return updated;
    });
  };

  const clearAllSorts = () => {
    setActiveSorts([]);
    if (updateSortParams) {
      updateSortParams('id', 'asc');
    }
  };

  // 클라이언트 사이드 정렬 (서버 정렬 후 추가 정렬이 필요한 경우)
  const sortedRows = useMemo(() => {
    if (activeSorts.length === 0) return initialRows;
    
    // 첫 번째 정렬은 서버에서 처리되므로, 두 번째 정렬부터 클라이언트에서 처리
    const clientSorts = activeSorts.slice(1);
    if (clientSorts.length === 0) return initialRows;
    
    return [...initialRows].sort((a, b) => {
      for (const sort of clientSorts) {
        let aValue, bValue;
        
        // 속성별 값 추출
        if (sort.propertyId === 'id') {
          aValue = a.id;
          bValue = b.id;
        } else if (sort.propertyId === 'email') {
          aValue = a.email || '';
          bValue = b.email || '';
        } else if (sort.propertyId === 'name') {
          aValue = a.name || '';
          bValue = b.name || '';
        } else if (sort.propertyId === 'role') {
          aValue = a.role || '';
          bValue = b.role || '';
        } else if (sort.propertyId === 'createdAt') {
          aValue = a.createdAt || '';
          bValue = b.createdAt || '';
        } else if (sort.propertyId === 'lastLoginAt') {
          aValue = a.lastLoginAt || '';
          bValue = b.lastLoginAt || '';
        } else {
          aValue = a[sort.propertyId] || '';
          bValue = b[sort.propertyId] || '';
        }
        
        // 타입별 비교
        let comparison = 0;
        
        if (sort.propertyType === 'DATE' || sort.propertyType === 'NUMBER') {
          const aVal = sort.propertyType === 'DATE' ? (aValue ? new Date(aValue) : null) : (aValue ? parseFloat(aValue) : null);
          const bVal = sort.propertyType === 'DATE' ? (bValue ? new Date(bValue) : null) : (bValue ? parseFloat(bValue) : null);
          
          if (aVal === null && bVal === null) {
            comparison = 0;
          } else if (aVal === null) {
            comparison = 1;
          } else if (bVal === null) {
            comparison = -1;
          } else {
            comparison = aVal - bVal;
          }
        } else {
          const aStr = String(aValue || '');
          const bStr = String(bValue || '');
          
          if (!aValue && !bValue) {
            comparison = 0;
          } else if (!aValue) {
            comparison = 1;
          } else if (!bValue) {
            comparison = -1;
          } else {
            comparison = aStr.localeCompare(bStr);
          }
        }
        
        if (comparison !== 0) {
          return sort.order === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }, [initialRows, activeSorts]);

  const hasActiveSorts = activeSorts.length > 0;

  // 현재 정렬된 순서의 ID 배열 반환
  const getSortedDocumentIds = () => {
    return sortedRows.map(row => row.id);
  };

  return {
    activeSorts,
    addSort,
    updateSort,
    removeSort,
    clearAllSorts,
    sortedRows,
    hasActiveSorts,
    getSortedDocumentIds
  };
};

export default useUserTableSort;

