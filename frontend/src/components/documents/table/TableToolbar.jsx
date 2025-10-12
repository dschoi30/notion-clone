import React, { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import SearchSlideInput from './SearchSlideInput';
import FilterDropdown from './FilterDropdown';
import SortDropdown from './SortDropdown';
import SortManager from './SortManager';
import { useNotification } from '@/contexts/NotificationContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ZIndexUtils } from '@/constants/zIndex';

const TableToolbar = ({ 
  onAddNewDocument,
  searchQuery,
  setSearchQuery,
  isSearchOpen,
  setIsSearchOpen,
  clearSearch,
  properties,
  onFilterAdd,
  activeSorts = [],
  onSortAdd,
  onSortUpdate,
  onSortRemove,
  onClearAllSorts,
  isReadOnly = false,
  anchorRef,
  isOwner = false,
  workspaceId,
  documentId,
  getSortedDocumentIds,
  documentCount = 0
}) => {
  const [fixedTop, setFixedTop] = useState(null);
  const { isNotificationModalOpen } = useNotification();
  const { isSettingsPanelOpen, isSearchModalOpen } = useWorkspace();
  
  useLayoutEffect(() => {
    if (!anchorRef?.current) return;
    
    let animationId = null;
    
    const updatePosition = () => {
      if (!anchorRef?.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      setFixedTop(rect.top - 36);
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
  }, [anchorRef]);

  const handleSearchClose = () => {
    setIsSearchOpen(false);
    clearSearch();
  };

  // 모달이 열려있을 때 z-index를 낮춤
  const isModalOpen = isNotificationModalOpen || isSettingsPanelOpen || isSearchModalOpen;
  const toolbarZIndex = ZIndexUtils.getTableToolbarZIndex(isModalOpen);
  const sortManagerZIndex = ZIndexUtils.getTableToolbarZIndex(isModalOpen);

  return (
    <div ref={anchorRef} className="h-0">
      {/* 정렬 관리자 - 테이블 좌측 상단 */}
      {activeSorts.length > 0 && (
        <div 
          className="fixed left-84"
          style={{ top: (fixedTop ?? 0) + 10, zIndex: sortManagerZIndex }}
        >
          <SortManager
            activeSorts={activeSorts}
            onSortAdd={onSortAdd}
            onSortUpdate={onSortUpdate} 
            onSortRemove={onSortRemove}
            properties={properties}
            isReadOnly={isReadOnly}
            isOwner={isOwner}
            workspaceId={workspaceId}
            documentId={documentId}
            getSortedDocumentIds={getSortedDocumentIds}
          />
        </div>
      )}

      {/* 뷰포트 우측 고정 (세로 위치는 초기 위치 고정) */}
      <div
        className="fixed right-20"
        style={{ top: fixedTop ?? 0, zIndex: toolbarZIndex }}
      >
        <div className="flex gap-0.5 items-center">
          {/* 필터 아이콘 - 아직 구현 안됨 */}
          {/* <FilterDropdown 
            properties={properties}
            onFilterAdd={onFilterAdd}
            isReadOnly={isReadOnly}
          /> */}
          
          {/* 정렬 아이콘 */}
          <SortDropdown
            properties={properties}
            onSortAdd={onSortAdd}
            onClearAllSorts={onClearAllSorts}
            isReadOnly={isReadOnly}
            activeSorts={activeSorts}
          />
          
          {/* 검색 인풋 (인라인 확장). 기존 돋보기 버튼은 컴포넌트 내부 onToggle로 이동 */}
          <SearchSlideInput
            isOpen={isSearchOpen}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onClose={handleSearchClose}
            clearSearch={clearSearch}
            onToggle={() => setIsSearchOpen(!isSearchOpen)}
          />
          
          
          {!isReadOnly && (
            <Button 
              size="sm" 
              onClick={onAddNewDocument}
              className="flex gap-2 items-center ml-2"
            >
              <Plus size={14} />
              새 문서
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableToolbar;
