import React, { useState, useRef, useMemo, useEffect, useCallback, useLayoutEffect } from 'react';
import { useThrottle } from '@/hooks/useThrottle';
import { useUserTableData } from './hooks/useUserTableData';
import { useUserTableSearch } from './hooks/useUserTableSearch';
import { useUserTableFilters } from './hooks/useUserTableFilters';
import useUserTableSort from './hooks/useUserTableSort';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import ErrorMessage from '@/components/error/ErrorMessage';
import { formatKoreanDateSmart } from '@/lib/utils';
import UserBadge from '@/components/documents/shared/UserBadge';
import { Badge } from '@/components/ui/badge';
import SearchSlideInput from '@/components/documents/table/SearchSlideInput';
import SortDropdown from '@/components/documents/table/SortDropdown';
import SortManager from '@/components/documents/table/SortManager';
import { Z_INDEX } from '@/constants/zIndex';
import { Loader2 } from 'lucide-react';

// 사용자 테이블 속성 정의
const USER_PROPERTIES = [
  { id: 'id', name: 'ID', type: 'NUMBER', width: 100 },
  { id: 'email', name: '이메일', type: 'TEXT', width: 200 },
  { id: 'profileImageUrl', name: '이름', type: 'USER', width: 150 },
  { id: 'role', name: '역할', type: 'ROLE', width: 120 },
  { id: 'createdAt', name: '생성일시', type: 'DATE', width: 180 },
  { id: 'lastLoginAt', name: '마지막 로그인', type: 'DATE', width: 180 },
];

// 정렬용 속성 정의
const SORT_PROPERTIES = [
  { id: 'id', name: 'ID', type: 'NUMBER' },
  { id: 'email', name: '이메일', type: 'TEXT' },
  { id: 'name', name: '이름', type: 'TEXT' },
  { id: 'role', name: '역할', type: 'ROLE' },
  { id: 'createdAt', name: '생성일시', type: 'DATE' },
  { id: 'lastLoginAt', name: '마지막 로그인', type: 'DATE' },
];

const UserManagementPanel = () => {
  const tableContainerRef = useRef(null);
  const anchorRef = useRef(null);
  const [displayedRows, setDisplayedRows] = useState(50);
  const [fixedPosition, setFixedPosition] = useState({ top: null, left: null });
  const loadMoreRef = useRef(null);

  // 에러 처리 훅
  const { handleError, clearError } = useErrorHandler();

  // data hook
  const {
    rows,
    isLoading,
    isFetchingMore,
    hasMore,
    fetchNextPage,
    error,
    sortField,
    sortDir,
    updateSortParams,
  } = useUserTableData();

  // search hook
  const {
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    setIsSearchOpen,
    filteredRows: searchFilteredRows,
    clearSearch,
    hasActiveSearch
  } = useUserTableSearch(rows);

  // filter hook
  const {
    activeFilters,
    filteredRows: filterFilteredRows,
    hasActiveFilters
  } = useUserTableFilters(searchFilteredRows);

  // sort hook
  const {
    activeSorts,
    addSort,
    updateSort,
    removeSort,
    clearAllSorts,
    sortedRows,
    hasActiveSorts,
    getSortedDocumentIds
  } = useUserTableSort(filterFilteredRows, updateSortParams);

  // 최종 필터링된 데이터 (검색 + 필터 + 정렬 적용)
  const finalFilteredRows = useMemo(() => sortedRows, [sortedRows]);

  // 무한 스크롤 로직 (Intersection Observer 사용)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !isFetchingMore) {
          fetchNextPage();
          setDisplayedRows(prev => Math.min(prev + 50, finalFilteredRows.length + 50));
        }
      },
      {
        threshold: 0,
        rootMargin: '0px 0px 320px 0px'
      }
    );
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    
    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [finalFilteredRows.length, hasMore, isFetchingMore, fetchNextPage]);

  // 검색/필터 변경 시 displayedRows 초기화
  useEffect(() => {
    setDisplayedRows(50);
  }, [searchQuery, activeFilters, activeSorts]);

  // tableView와 동일한 방식으로 SortManager 위치 계산
  useLayoutEffect(() => {
    if (!anchorRef?.current) return;
    
    let animationId = null;
    
    const updatePosition = () => {
      if (!anchorRef?.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      setFixedPosition({ top: rect.top - 36, left: rect.left });
    };

    // 초기 위치 설정
    updatePosition();

    const handleResize = () => {
      if (animationId) cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(updatePosition);
    };
    
    const handleScroll = () => {
      if (animationId) cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(updatePosition);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 표시할 행 데이터 (무한 스크롤 적용)
  const visibleRows = useMemo(() => {
    return finalFilteredRows.slice(0, displayedRows);
  }, [finalFilteredRows, displayedRows]);

  // 컬럼 너비 (기본값)
  const colWidths = useMemo(() => {
    return [200, ...USER_PROPERTIES.map(p => p.width || 150)];
  }, []);

  // 역할 표시
  const getRoleBadge = (role) => {
    const roleMap = {
      'SUPER_ADMIN': { label: '슈퍼 관리자', variant: 'destructive' },
      'ADMIN': { label: '관리자', variant: 'secondary' },
      'USER': { label: '사용자', variant: 'outline' },
    };
    const roleInfo = roleMap[role] || { label: role, variant: 'outline' };
    return (
      <Badge variant={roleInfo.variant}>
        {roleInfo.label}
      </Badge>
    );
  };

  // 셀 내용 렌더링
  const renderCellContent = (row, propertyId) => {
    switch (propertyId) {
      case 'id':
        return <span className="text-sm text-gray-600">{row.id}</span>;
      case 'email':
        return <span className="text-sm">{row.email || ''}</span>;
      case 'name':
        return <span className="text-sm">{row.name || ''}</span>;
      case 'profileImageUrl':
        return (
          <UserBadge
            name={row.name}
            email={row.email}
            profileImageUrl={row.profileImageUrl}
            size={24}
            showLabel={true}
          />
        );
      case 'role':
        return getRoleBadge(row.role);
      case 'createdAt':
        return (
          <span className="text-sm text-gray-600">
            {row.createdAt ? formatKoreanDateSmart(row.createdAt) : ''}
          </span>
        );
      case 'lastLoginAt':
        return (
          <span className="text-sm text-gray-600">
            {row.lastLoginAt ? formatKoreanDateSmart(row.lastLoginAt) : '로그인 기록 없음'}
          </span>
        );
      default:
        return null;
    }
  };

  if (error) {
    return <ErrorMessage error={error} onClear={clearError} />;
  }

  return (
    <div className="space-y-4">
      {/* 정렬 관리자 - 테이블 좌측 상단 (tableView와 동일한 방식) */}
      {activeSorts.length > 0 && fixedPosition.top !== null && fixedPosition.left !== null && (
        <div 
          className="fixed"
          style={{ 
            top: fixedPosition.top + 10, 
            left: fixedPosition.left,
            zIndex: Z_INDEX.SETTINGS_PANEL + 10 
          }}
        >
          <SortManager
            activeSorts={activeSorts}
            onSortAdd={addSort}
            onSortUpdate={updateSort}
            onSortRemove={removeSort}
            properties={SORT_PROPERTIES}
            isReadOnly={false}
            isOwner={false}
            workspaceId={null}
            documentId={null}
            getSortedDocumentIds={getSortedDocumentIds}
            autoAddNameProperty={false}
          />
        </div>
      )}

      {/* 툴바 - anchorRef로 사용 */}
      <div 
        ref={anchorRef}
        className="flex justify-between items-center"
      >
        {/* 좌측: 빈 공간 (드롭다운 메뉴가 여기에 표시됨) */}
        <div></div>
        
        {/* 우측: 정렬 드롭다운 버튼 + 검색 */}
        <div className="flex items-center gap-2">
          {/* 정렬 드롭다운 - 정렬이 없을 때만 표시 */}
          {activeSorts.length === 0 && (
            <SortDropdown
              properties={SORT_PROPERTIES}
              onSortAdd={addSort}
              onClearAllSorts={clearAllSorts}
              isReadOnly={false}
              activeSorts={activeSorts}
              autoAddNameProperty={false}
              menuAlign="start"
            />
          )}
          
          {/* 검색 */}
          <SearchSlideInput
            isOpen={isSearchOpen}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onClose={() => setIsSearchOpen(false)}
            clearSearch={clearSearch}
            onToggle={() => setIsSearchOpen(!isSearchOpen)}
          />
        </div>
      </div>

      {/* 테이블 */}
      <div
        ref={tableContainerRef}
        className="overflow-auto border rounded-lg"
        style={{ maxHeight: 'calc(85vh - 200px)' }}
      >
        {/* 헤더 */}
        <div
          className="flex sticky top-0 items-center bg-white border-b"
          style={{ zIndex: Z_INDEX.TABLE_HEADER }}
        >
          {USER_PROPERTIES.map((prop, idx) => (
            <div
              key={prop.id}
              className="flex items-center px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-50"
              style={{ minWidth: colWidths[idx + 1], width: colWidths[idx + 1] }}
            >
              {prop.name}
            </div>
          ))}
        </div>

        {/* 본문 */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="flex justify-center items-center py-12 text-gray-500">
            {hasActiveSearch || hasActiveFilters ? '검색 결과가 없습니다.' : '사용자가 없습니다.'}
          </div>
        ) : (
          <>
            {visibleRows.map((row, rowIdx) => (
              <div
                key={row.id}
                className="flex items-center border-b hover:bg-gray-50"
                style={{ minHeight: '40px' }}
              >
                {USER_PROPERTIES.map((prop, idx) => (
                  <div
                    key={prop.id}
                    className="flex items-center px-4 py-2 text-sm"
                    style={{ minWidth: colWidths[idx + 1], width: colWidths[idx + 1] }}
                  >
                    {renderCellContent(row, prop.id)}
                  </div>
                ))}
              </div>
            ))}
            
            {/* 무한 스크롤 트리거 */}
            {hasMore && (
              <div ref={loadMoreRef} className="flex justify-center items-center py-4">
                {isFetchingMore && (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserManagementPanel;

