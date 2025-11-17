import React, { useState, useRef, useMemo, useEffect, useCallback, useLayoutEffect } from 'react';
import { useUserTableData } from './hooks/useUserTableData';
import { useUserTableSearch } from './hooks/useUserTableSearch';
import { useUserTableFilters } from './hooks/useUserTableFilters';
import useUserTableSort from './hooks/useUserTableSort';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useAuth } from '@/contexts/AuthContext';
import ErrorMessage from '@/components/error/ErrorMessage';
import { formatKoreanDateSmart } from '@/lib/utils';
import UserBadge from '@/components/documents/shared/UserBadge';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import SearchSlideInput from '@/components/documents/table/SearchSlideInput';
import SortDropdown from '@/components/documents/table/SortDropdown';
import SortManager from '@/components/documents/table/SortManager';
import UserActionPopover from './UserActionPopover';
import BulkUserActionPopover from './BulkUserActionPopover';
import { Z_INDEX } from '@/constants/zIndex';
import { Loader2 } from 'lucide-react';

// 사용자 테이블 속성 정의
const USER_PROPERTIES = [
  { id: 'id', name: 'ID', type: 'NUMBER', width: 100 },
  { id: 'email', name: '이메일', type: 'TEXT', width: 200 },
  { id: 'profileImageUrl', name: '이름', type: 'USER', width: 180 },
  { id: 'role', name: '역할', type: 'ROLE', width: 120 },
  { id: 'isActive', name: '계정 잠금', type: 'BOOLEAN', width: 100 },
  { id: 'createdAt', name: '생성일시', type: 'DATE', width: 210 },
  { id: 'updatedAt', name: '수정일시', type: 'DATE', width: 210 },
  { id: 'lastLoginAt', name: '마지막 로그인', type: 'DATE', width: 210 },
];

// 정렬용 속성 정의
const SORT_PROPERTIES = [
  { id: 'id', name: 'ID', type: 'NUMBER' },
  { id: 'email', name: '이메일', type: 'TEXT' },
  { id: 'name', name: '이름', type: 'TEXT' },
  { id: 'role', name: '역할', type: 'ROLE' },
  { id: 'createdAt', name: '생성일시', type: 'DATE' },
  { id: 'updatedAt', name: '수정일시', type: 'DATE' },
  { id: 'lastLoginAt', name: '마지막 로그인', type: 'DATE' },
];

const UserManagementPanel = () => {
  const tableContainerRef = useRef(null);
  const anchorRef = useRef(null);
  const [displayedRows, setDisplayedRows] = useState(50);
  const [fixedPosition, setFixedPosition] = useState({ top: null, left: null });
  const loadMoreRef = useRef(null);
  const bulkActionAnchorRef = useRef(null);
  const userActionAnchorRefs = useRef({});

  // 체크박스 및 팝오버 상태
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [popoverOpenUserId, setPopoverOpenUserId] = useState(null);
  const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false);
  const [bulkActionPosition, setBulkActionPosition] = useState({ top: null, left: null });
  const [userActionPositions, setUserActionPositions] = useState({});

  // 훅
  const { user } = useAuth();
  const { clearError } = useErrorHandler();

  // data hook
  const {
    rows,
    isLoading,
    isFetchingMore,
    hasMore,
    fetchNextPage,
    fetchTableData,
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
      setFixedPosition({ top: rect.top - 10, left: rect.left });
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

  // BulkUserActionPopover 위치 업데이트 (스크롤/리사이즈 시)
  useEffect(() => {
    if (!bulkActionMenuOpen || !bulkActionAnchorRef.current || selectedUserIds.size === 0) return;

    let animationId = null;
    
    const updateBulkPosition = () => {
      if (!bulkActionAnchorRef.current) return;
      const rect = bulkActionAnchorRef.current.getBoundingClientRect();
      setBulkActionPosition({
        top: rect.top,
        left: rect.right + 8, // 버튼 우측 8px
      });
    };

    const handleResize = () => {
      if (animationId) cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(updateBulkPosition);
    };
    
    const handleScroll = () => {
      if (animationId) cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(updateBulkPosition);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [bulkActionMenuOpen, selectedUserIds.size]);

  // 선택 해제 시 팝오버도 닫기
  useEffect(() => {
    if (selectedUserIds.size === 0) {
      setBulkActionMenuOpen(false);
      setBulkActionPosition({ top: null, left: null });
    }
  }, [selectedUserIds.size]);

  // UserActionPopover 위치 업데이트 (스크롤/리사이즈 시)
  useEffect(() => {
    if (!popoverOpenUserId || Object.keys(userActionPositions).length === 0) return;

    let animationId = null;
    
    const updateUserActionPositions = () => {
      const newPositions = {};
      Object.keys(userActionPositions).forEach(userId => {
        const anchorRef = userActionAnchorRefs.current[userId];
        if (anchorRef) {
          const rect = anchorRef.getBoundingClientRect();
          newPositions[userId] = {
            top: rect.top,
            left: rect.right + 8,
          };
        }
      });
      if (Object.keys(newPositions).length > 0) {
        setUserActionPositions(newPositions);
      }
    };

    const handleResize = () => {
      if (animationId) cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(updateUserActionPositions);
    };
    
    const handleScroll = () => {
      if (animationId) cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(updateUserActionPositions);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [popoverOpenUserId, userActionPositions]);

  // 표시할 행 데이터 (무한 스크롤 적용)
  const visibleRows = useMemo(() => {
    return finalFilteredRows.slice(0, displayedRows);
  }, [finalFilteredRows, displayedRows]);

  // 체크박스 핸들러
  const handleSelectUser = useCallback((userId) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  // 전체 선택/해제
  const handleSelectAll = useCallback(() => {
    if (selectedUserIds.size === visibleRows.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(visibleRows.map(row => row.id)));
    }
  }, [visibleRows, selectedUserIds.size]);

  // 액션 완료 후 처리
  const handleActionComplete = useCallback((actionType, data) => {
    // 토스트는 팝오버에서 처리됨
    // 여기서는 데이터 새로고침 또는 상태 업데이트 처리
    setPopoverOpenUserId(null);
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(data.userId);
      return newSet;
    });
    fetchTableData();
  }, [fetchTableData]);

  // 컬럼 너비 (기본값 - 체크박스 컬럼 포함)
  const colWidths = useMemo(() => {
    return [50, ...USER_PROPERTIES.map(p => p.width || 150)];
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
        return (
          <span className="text-sm max-w-full block truncate" title={row.email || ''}>
            {row.email || ''}
          </span>
        );
      case 'name':
        return (
          <span className="text-sm max-w-full block truncate" title={row.name || ''}>
            {row.name || ''}
          </span>
        );
      case 'profileImageUrl':
        return (
          <div className="flex items-center gap-2 min-w-0">
            <UserBadge
              name={row.name}
              email={row.email}
              profileImageUrl={row.profileImageUrl}
              size={24}
              showLabel={false}
            />
            <span className="text-sm truncate" title={row.name || ''}>
              {row.name || ''}
            </span>
          </div>
        );
      case 'role':
        return getRoleBadge(row.role);
      case 'createdAt':
        return (
          <span className="text-sm text-gray-600">
            {row.createdAt ? formatKoreanDateSmart(row.createdAt) : ''}
          </span>
        );
      case 'updatedAt':
        return (
          <span className="text-sm text-gray-600">
            {row.updatedAt ? formatKoreanDateSmart(row.updatedAt) : ''}
          </span>
        );
      case 'isActive':
        return (
          <span className="text-sm text-gray-600">
            {row.isActive ? '아니오' : '예'}
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
      <div className="relative">
        {/* 선택 상태 표시 - DocumentTableView와 동일한 스타일 */}
        {selectedUserIds.size > 0 && (
          <div 
            className="flex absolute gap-2 items-center px-3 py-1 bg-white rounded border shadow-sm" 
            style={{ 
              top: activeSorts.length > 0 ? -100 : -50,
              zIndex: Z_INDEX.POPOVER + 1
            }}
          >
            <span className="text-sm text-gray-600">{selectedUserIds.size}개 선택됨</span>
            <button
              className="inline-flex gap-1 items-center text-blue-600 hover:text-blue-700 text-sm"
              onClick={() => {
                setSelectedUserIds(new Set());
                setBulkActionMenuOpen(false);
              }}
            >
              선택 해제
            </button>
            
            {/* ... 버튼 */}
            {user?.role === 'SUPER_ADMIN' && (
              <button
                ref={bulkActionAnchorRef}
                className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-800 ml-1"
                onClick={(e) => {
                  e.stopPropagation();
                  if (bulkActionAnchorRef.current) {
                    const rect = bulkActionAnchorRef.current.getBoundingClientRect();
                    setBulkActionPosition({
                      top: rect.top,
                      left: rect.right + 8, // 버튼 우측 8px
                    });
                  }
                  setBulkActionMenuOpen(!bulkActionMenuOpen);
                }}
                aria-label="일괄 작업 메뉴"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* 일괄 작업 팝오버 - ... 버튼 바로 우측에 표시 */}
        {bulkActionMenuOpen && selectedUserIds.size > 0 && bulkActionPosition.top !== null && bulkActionPosition.left !== null && (
          <div
            className="fixed"
            style={{
              top: bulkActionPosition.top,
              left: bulkActionPosition.left,
              zIndex: Z_INDEX.POPOVER,
            }}
          >
            <BulkUserActionPopover
              selectedUserIds={selectedUserIds}
              selectedUsers={finalFilteredRows.filter(row => selectedUserIds.has(row.id))}
              isAllSelected={selectedUserIds.size === visibleRows.length && visibleRows.length > 0}
              anchorRef={bulkActionAnchorRef}
              onClose={() => {
                setBulkActionMenuOpen(false);
              }}
              onActionComplete={(actionType, data) => {
                setBulkActionMenuOpen(false);
                setSelectedUserIds(new Set());
                fetchTableData();
              }}
              currentUserRole={user?.role}
            />
          </div>
        )}
        
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
          {/* 체크박스 컬럼 */}
          <div
            className="flex items-center justify-center px-4 py-2 bg-gray-50 border-r"
            style={{ minWidth: colWidths[0], width: colWidths[0] }}
          >
            <Checkbox
              checked={selectedUserIds.size === visibleRows.length && visibleRows.length > 0}
              onCheckedChange={handleSelectAll}
              aria-label="전체 선택"
            />
          </div>

          {/* 데이터 컬럼 */}
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
            {visibleRows.map((row) => {
              const isSelected = selectedUserIds.has(row.id);
              const isPopoverOpen = popoverOpenUserId === row.id;

              return (
                <div
                  key={row.id}
                  className={`flex items-center border-b relative ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  style={{ minHeight: '40px' }}
                >
                  {/* 체크박스 컬럼 */}
                  <div
                    className="flex items-center justify-center px-4 py-2 border-r"
                    style={{ minWidth: colWidths[0], width: colWidths[0] }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectUser(row.id)}
                      aria-label={`${row.email} 선택`}
                    />
                  </div>

                  {/* 데이터 컬럼 */}
                  <div className="flex-1 flex items-center">
                    {USER_PROPERTIES.map((prop, idx) => (
                      <div
                        key={prop.id}
                        className="flex items-center px-4 py-2 text-sm overflow-hidden"
                        style={{ minWidth: colWidths[idx + 1], width: colWidths[idx + 1] }}
                      >
                        {renderCellContent(row, prop.id)}
                      </div>
                    ))}
                  </div>

                  {/* ... 버튼 및 팝오버 */}
                  {user?.role === 'SUPER_ADMIN' && (
                    <div className="flex items-center px-2 relative">
                      <button
                        ref={(el) => {
                          if (el) {
                            userActionAnchorRefs.current[row.id] = el;
                          } else {
                            delete userActionAnchorRefs.current[row.id];
                          }
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          const buttonRect = e.currentTarget.getBoundingClientRect();
                          setUserActionPositions(prev => ({
                            ...prev,
                            [row.id]: {
                              top: buttonRect.top,
                              left: buttonRect.right + 8, // 버튼 우측 8px
                            }
                          }));
                          setPopoverOpenUserId(isPopoverOpen ? null : row.id);
                        }}
                        aria-label="사용자 작업 메뉴"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </button>

                      {/* 팝오버 메뉴 - 버튼 바로 우측에 표시 */}
                      {isPopoverOpen && userActionPositions[row.id] && (
                        <div
                          className="fixed"
                          style={{
                            top: userActionPositions[row.id].top,
                            left: userActionPositions[row.id].left,
                            zIndex: Z_INDEX.POPOVER,
                          }}
                        >
                          <UserActionPopover
                            user={row}
                            anchorRef={userActionAnchorRefs.current[row.id]}
                            onActionComplete={handleActionComplete}
                            isOpen={isPopoverOpen}
                            onClose={() => {
                              setPopoverOpenUserId(null);
                              setUserActionPositions(prev => {
                                const newPositions = { ...prev };
                                delete newPositions[row.id];
                                return newPositions;
                              });
                            }}
                            currentUserRole={user?.role}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            
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
    </div>
  );
};

export default UserManagementPanel;

