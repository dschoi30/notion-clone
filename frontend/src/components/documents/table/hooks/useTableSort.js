import { useState, useMemo, useEffect } from 'react';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';

const useTableSort = (initialRows = [], documentId = null) => {
  const [activeSorts, setActiveSorts] = useState([]);
  const { user } = useAuth();
  
  // 임시 로그 함수
  const log = createLogger('useTableSort');

  // 로컬스토리지 키 생성
  const getStorageKey = () => {
    if (!user?.id || !documentId) return null;
    return `tableSort_${user.id}_${documentId}`;
  };

  // 로컬스토리지에서 정렬 상태 불러오기
  const loadSortsFromStorage = () => {
    const key = getStorageKey();
    if (!key) return [];
    
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        log.debug('Loaded sorts from storage:', parsed);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      log.error('Failed to load sorts from storage:', error);
    }
    return [];
  };

  // 로컬스토리지에 정렬 상태 저장
  const saveSortsToStorage = (sorts) => {
    const key = getStorageKey();
    if (!key) return;
    
    try {
      localStorage.setItem(key, JSON.stringify(sorts));
      log.debug('Saved sorts to storage:', sorts);
    } catch (error) {
      log.error('Failed to save sorts to storage:', error);
    }
  };

  // 컴포넌트 마운트 시 로컬스토리지에서 정렬 상태 불러오기
  useEffect(() => {
    if (user?.id && documentId) {
      const storedSorts = loadSortsFromStorage();
      if (storedSorts.length > 0) {
        setActiveSorts(storedSorts);
        log.debug('Restored sorts from storage:', storedSorts);
      }
    }
  }, [user?.id, documentId]);

  const addSort = (property, defaultOrder = 'asc') => {
    const newSort = {
      id: `sort_${Date.now()}`,
      propertyId: property.id,
      propertyName: property.name,
      propertyType: property.type,
      order: defaultOrder
    };
    
    log.debug('Adding new sort:', newSort);
    setActiveSorts(prev => {
      const updated = [...prev, newSort];
      log.debug('Updated activeSorts after add:', updated);
      saveSortsToStorage(updated);
      return updated;
    });
  };

  const updateSort = (sortId, updates) => {
    log.debug('updateSort called:', { sortId, updates });
    setActiveSorts(prev => {
      const updated = prev.map(sort => 
        sort.id === sortId ? { ...sort, ...updates } : sort
      );
      log.debug('Updated activeSorts after update:', updated);
      saveSortsToStorage(updated);
      return updated;
    });
  };

  const removeSort = (sortId) => {
    setActiveSorts(prev => {
      const updated = prev.filter(sort => sort.id !== sortId);
      saveSortsToStorage(updated);
      return updated;
    });
  };

  const clearAllSorts = () => {
    setActiveSorts([]);
    saveSortsToStorage([]);
  };

  // 정렬된 행 데이터
  const sortedRows = useMemo(() => {
    if (activeSorts.length === 0) return initialRows;
    return [...initialRows].sort((a, b) => {
      for (const sort of activeSorts) {
        let aValue, bValue;

        // 시스템 속성 처리
        if (sort.propertyId === 0 && sort.propertyType === 'TEXT') {
          // '이름' 속성
          aValue = a.title || '';
          bValue = b.title || '';
          log.debug('Title sort:', { aValue, bValue });
        } else if (sort.propertyType === 'CREATED_AT') {
          // 생성일 속성
          aValue = a.document?.createdAt || '';
          bValue = b.document?.createdAt || '';
          log.debug('CreatedAt sort:', { 
            aValue, bValue, 
            aCreatedAt: a.document?.createdAt, 
            bCreatedAt: b.document?.createdAt 
          });
        } else if (sort.propertyType === 'LAST_UPDATED_AT') {
          // 수정일 속성
          aValue = a.document?.updatedAt || '';
          bValue = b.document?.updatedAt || '';
          log.debug('UpdatedAt sort:', { 
            aValue, bValue, 
            aUpdatedAt: a.document?.updatedAt, 
            bUpdatedAt: b.document?.updatedAt 
          });
        } else if (sort.propertyType === 'CREATED_BY') {
          // 생성자 속성 (시스템 속성)
          aValue = a.document?.createdBy || '';
          bValue = b.document?.createdBy || '';
          log.debug('CreatedBy sort:', { 
            aValue, bValue, 
            aCreatedBy: a.document?.createdBy, 
            bCreatedBy: b.document?.createdBy 
          });
        } else if (sort.propertyType === 'LAST_UPDATED_BY') {
          // 최종 편집자 속성 (시스템 속성)
          aValue = a.document?.updatedBy || '';
          bValue = b.document?.updatedBy || '';
          log.debug('LastUpdatedBy sort:', { 
            aValue, bValue, 
            aUpdatedBy: a.document?.updatedBy, 
            bUpdatedBy: b.document?.updatedBy 
          });
        } 
        // 사용자 정의 속성은 values 필드에서 직접 가져오기
        else {
          aValue = a.values?.[sort.propertyId] || '';
          bValue = b.values?.[sort.propertyId] || '';
          log.debug('Custom property sort:', { 
            propertyId: sort.propertyId, 
            propertyType: sort.propertyType,
            propertyName: sort.propertyName,
            aValue, bValue,
            aValues: a.values,
            bValues: b.values
          });
        }

        // 타입별 비교
        let comparison = 0;
        
        if (sort.propertyType === 'DATE' || sort.propertyType === 'CREATED_AT' || sort.propertyType === 'LAST_UPDATED_AT') {
          // 날짜 타입 비교 - 빈 값 처리
          const aDate = aValue ? new Date(aValue) : null;
          const bDate = bValue ? new Date(bValue) : null;
          
          // 빈 값 처리: 빈 값은 항상 뒤로 정렬 (오름차순/내림차순 관계없이)
          if (!aDate && !bDate) {
            comparison = 0; // 둘 다 빈 값
          } else if (!aDate) {
            comparison = 1; // a가 빈 값이면 뒤로
          } else if (!bDate) {
            comparison = -1; // b가 빈 값이면 뒤로
          } else {
            comparison = aDate - bDate; // 둘 다 유효한 날짜
          }
          
          log.debug('Date comparison:', { 
            propertyType: sort.propertyType,
            aValue, bValue, 
            aDate, bDate,
            comparison, 
            order: sort.order 
          });
        } else if (sort.propertyType === 'NUMBER') {
          // 숫자 타입 비교 - 빈 값 처리
          const aNum = aValue ? parseFloat(aValue) : null;
          const bNum = bValue ? parseFloat(bValue) : null;
          
          // 빈 값 처리: 빈 값은 항상 뒤로 정렬 (오름차순/내림차순 관계없이)
          if (aNum === null && bNum === null) {
            comparison = 0; // 둘 다 빈 값
          } else if (aNum === null) {
            comparison = 1; // a가 빈 값이면 뒤로
          } else if (bNum === null) {
            comparison = -1; // b가 빈 값이면 뒤로
          } else {
            comparison = aNum - bNum; // 둘 다 유효한 숫자
          }
          
          log.debug('Number comparison:', { aValue, bValue, aNum, bNum, comparison });
        } else if (sort.propertyType === 'CREATED_BY' || sort.propertyType === 'LAST_UPDATED_BY') {
          // 생성자/수정자 타입 비교 (이메일 또는 사용자명) - 빈 값 처리
          const aStr = String(aValue || '');
          const bStr = String(bValue || '');
          
          // 빈 값 처리: 빈 값은 항상 뒤로 정렬 (오름차순/내림차순 관계없이)
          if (!aValue && !bValue) {
            comparison = 0; // 둘 다 빈 값
          } else if (!aValue) {
            comparison = 1; // a가 빈 값이면 뒤로
          } else if (!bValue) {
            comparison = -1; // b가 빈 값이면 뒤로
          } else {
            comparison = aStr.localeCompare(bStr); // 둘 다 유효한 값
          }
          
          log.debug('User comparison:', { 
            propertyType: sort.propertyType,
            aValue, bValue, 
            aStr, bStr,
            comparison 
          });
        } else {
          // 텍스트 타입 (TEXT, SELECT, URL 등) - 빈 값 처리
          const aStr = String(aValue || '');
          const bStr = String(bValue || '');
          
          // 빈 값 처리: 빈 값은 항상 뒤로 정렬 (오름차순/내림차순 관계없이)
          if (!aValue && !bValue) {
            comparison = 0; // 둘 다 빈 값
          } else if (!aValue) {
            comparison = 1; // a가 빈 값이면 뒤로
          } else if (!bValue) {
            comparison = -1; // b가 빈 값이면 뒤로
          } else {
            comparison = aStr.localeCompare(bStr); // 둘 다 유효한 값
          }
          
          log.debug('Text comparison:', { 
            propertyType: sort.propertyType,
            aValue, bValue, 
            aStr, bStr,
            comparison 
          });
        }

        if (comparison !== 0) {
          // 빈 값 처리: 빈 값은 항상 맨 아래로, 유효한 값들은 정렬 방향에 따라
          let result;
          
          // 둘 중 하나가 빈 값인 경우
          if (!aValue || !bValue) {
            if (!aValue && !bValue) {
              result = 0; // 둘 다 빈 값
            } else if (!aValue) {
              result = 1; // a가 빈 값이면 뒤로
            } else {
              result = -1; // b가 빈 값이면 뒤로
            }
          } else {
            // 둘 다 유효한 값인 경우: 정렬 방향에 따라
            result = sort.order === 'desc' ? -comparison : comparison;
          }
          
          log.debug('Final result:', { 
            comparison, 
            order: sort.order, 
            result, 
            aValue, 
            bValue,
            aEmpty: !aValue,
            bEmpty: !bValue
          });
          return result;
        }
      }
      return 0;
    });
  }, [initialRows, activeSorts]);

  const hasActiveSorts = activeSorts.length > 0;

  // 현재 정렬된 순서의 documentId 배열 반환
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

export default useTableSort;
