import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useThrottle } from '@/hooks/useThrottle';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import AddPropertyPopover from './AddPropertyPopover';
import { useDocumentPropertiesStore } from '@/hooks/useDocumentPropertiesStore';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { updateChildDocumentOrder, deleteDocument } from '@/services/documentApi';
import { Trash2 } from 'lucide-react';
import TableHeader from './table/TableHeader';
import TableRow from './table/TableRow';
import TableToolbar from './table/TableToolbar';
import { slugify } from './table/utils.jsx';
import { usePropertiesDnd } from '@/components/documents/shared/hooks/usePropertiesDnd';
import { useColumnResize } from './table/hooks/useColumnResize';
import { useTableData } from './table/hooks/useTableData';
import { useTableSearch } from './table/hooks/useTableSearch';
import { useTableFilters } from './table/hooks/useTableFilters';
import useTableSort from './table/hooks/useTableSort';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import ErrorMessage from '@/components/error/ErrorMessage';
import { DEFAULT_PROPERTY_WIDTH, SYSTEM_PROP_TYPES } from '@/components/documents/shared/constants';
import { buildSystemPropTypeMapForTable } from '@/components/documents/shared/systemPropTypeMap';
import { useAuth } from '@/contexts/AuthContext';
import { useDocument } from '@/contexts/DocumentContext';

const DocumentTableView = ({ workspaceId, documentId, isReadOnly = false }) => {
  const navigate = useNavigate(); // useNavigate 훅 추가
  const [editingCell, setEditingCell] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const addBtnRef = useRef(null);
  const tagCellRefs = useRef({}); // {rowId_propertyId: ref}
  const tableContainerRef = useRef(null);
  const [tagPopoverRect, setTagPopoverRect] = useState(null);
  const [showSortClearModal, setShowSortClearModal] = useState(false);
  const [pendingDragEvent, setPendingDragEvent] = useState(null);
  const [displayedRows, setDisplayedRows] = useState(50); // 무한 스크롤용 표시 행 수
  
  const systemPropTypeMap = useMemo(() => buildSystemPropTypeMapForTable(), []);
  
  // 쓰로틀링된 스크롤 핸들러 (16ms = 60fps)
  const throttledScrollHandler = useThrottle(useCallback(() => {
    if (editingCell && tagPopoverRect) {
      const { rowId, propertyId } = editingCell;
      const cellElement = document.querySelector(`[data-cell-id="${rowId}_${propertyId}"]`);
      if (cellElement) {
        const rect = cellElement.getBoundingClientRect();
        setTagPopoverRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      }
    }
  }, [editingCell, tagPopoverRect]), 16);

  // 스크롤 이벤트 핸들러 - 팝오버 위치 업데이트 (쓰로틀링 적용)
  useEffect(() => {
    // 테이블 컨테이너와 윈도우 스크롤 이벤트 모두 처리
    const tableContainer = tableContainerRef.current;
    if (tableContainer) {
      tableContainer.addEventListener('scroll', throttledScrollHandler, { passive: true });
    }
    window.addEventListener('scroll', throttledScrollHandler, { passive: true });
    
    return () => {
      if (tableContainer) {
        tableContainer.removeEventListener('scroll', throttledScrollHandler);
      }
      window.removeEventListener('scroll', throttledScrollHandler);
    };
  }, [throttledScrollHandler]);
  
  // 에러 처리 훅
  const { handleError, clearError } = useErrorHandler();
  
  // 소유자 확인
  const { user } = useAuth();

  // data hook
  const {
    properties: fetchedProperties,
    setProperties: setFetchedProperties,
    rows,
    setRows,
    isLoading,
    isFetchingMore,
    hasMore,
    fetchNextPage,
    error,
    editingHeader,
    setEditingHeader,
    handleAddProperty,
    handleDeleteProperty,
    handleAddRowTop,
    handleAddRowBottom,
    handleCellValueChange,
    handleHeaderNameChange,
    currentDocument,
  } = useTableData({ workspaceId, documentId, systemPropTypeMap });

  // 소유자 확인
  const isOwner = currentDocument && String(currentDocument.userId) === String(user?.id);

  // search hook
  const {
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    setIsSearchOpen,
    filteredRows: searchFilteredRows,
    clearSearch,
    hasActiveSearch
  } = useTableSearch(rows);

  // filter hook
  const {
    activeFilters,
    addFilter,
    removeFilter,
    clearAllFilters,
    filteredRows: filterFilteredRows,
    hasActiveFilters
  } = useTableFilters(searchFilteredRows);

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
  } = useTableSort(filterFilteredRows, documentId);

  // column resize
  const titleWidth = useDocumentPropertiesStore((state) => state.titleWidth);
  const updateTitleWidth = useDocumentPropertiesStore((state) => state.updateTitleWidth);
  const propertyWidths = fetchedProperties.map((p) => p.width ?? DEFAULT_PROPERTY_WIDTH);
  const { colWidths, handleResizeMouseDown } = useColumnResize({
    properties: fetchedProperties,
    titleWidth,
    propertyWidths,
    workspaceId,
    documentId,
    updateTitleWidthFn: updateTitleWidth, 
  });

  // column dnd
  const { sensors, handleColumnDragEnd } = usePropertiesDnd({
    properties: fetchedProperties,
    setProperties: setFetchedProperties,
    workspaceId,
    documentId,
  });
  
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  
  // propertiesForRender 메모이제이션
  const propertiesForRender = useMemo(() => fetchedProperties, [fetchedProperties]);
  
  // 최종 필터링된 데이터 (검색 + 필터 + 정렬 적용)
  const finalFilteredRows = useMemo(() => sortedRows, [sortedRows]);
  
  // 무한 스크롤 로직 (Intersection Observer 사용)
  const loadMoreRef = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          // 다음 페이지 로드 트리거
          fetchNextPage?.();
          setDisplayedRows(prev => Math.min(prev + 50, finalFilteredRows.length + 50));
        }
      },
      {
        threshold: 0,
        // 하단 고정 여백(푸터 등)을 고려해 충분히 큰 bottom margin을 준다
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
  }, [finalFilteredRows.length]);

  // 검색/필터 변경 시 displayedRows 초기화
  useEffect(() => {
    setDisplayedRows(50);
  }, [searchQuery, activeFilters, activeSorts]);

  // 표시할 행 데이터 (무한 스크롤 적용)
  const visibleRows = useMemo(() => {
    return finalFilteredRows.slice(0, displayedRows);
  }, [finalFilteredRows, displayedRows]);

  // 상단 툴바에서 새 문서 추가 (첫 번째 행에 추가)
  const handleAddNewDocument = useCallback(async () => {
    await handleAddRowTop();
  }, [handleAddRowTop]);

  const toggleSelect = useCallback((rowId) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);

  const handleRowDragEnd = useCallback(async (event) => {
    if (isReadOnly) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    // 정렬이 활성화된 상태에서 DnD 시도 시 모달 표시
    if (hasActiveSorts) {
      setPendingDragEvent(event);
      setShowSortClearModal(true);
      return;
    }
    
    // 정렬이 없으면 기존 로직 실행
    await executeRowDragEnd(event);
  }, [isReadOnly, hasActiveSorts]);

  const executeRowDragEnd = async (event) => {
    const { active, over } = event;
    const oldIndex = finalFilteredRows.findIndex((r) => r.id === active.id);
    const newIndex = finalFilteredRows.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const newRows = [...rows];
    const originalOldIndex = rows.findIndex((r) => r.id === active.id);
    const originalNewIndex = rows.findIndex((r) => r.id === over.id);
    const [moved] = newRows.splice(originalOldIndex, 1);
    newRows.splice(originalNewIndex, 0, moved);
    setRows(newRows);
    try {
      const ids = newRows.map((r) => r.id);
      await updateChildDocumentOrder(workspaceId, documentId, ids);
    } catch (e) {
      // 실패 시 원복
      setRows(rows);
      handleError(e, {
        customMessage: '행 순서 변경에 실패했습니다. 다시 시도해주세요.',
        showToast: true
      });
    }
  };

  const handleSortClearConfirm = async () => {
    clearAllSorts();
    setShowSortClearModal(false);
    if (pendingDragEvent) {
      await executeRowDragEnd(pendingDragEvent);
      setPendingDragEvent(null);
    }
  };

  const handleSortClearCancel = () => {
    setShowSortClearModal(false);
    setPendingDragEvent(null);
  };

  const handleBulkDelete = async () => {
    if (selectedRowIds.size === 0) return;
    if (!window.confirm(`${selectedRowIds.size}개 항목을 삭제하시겠습니까?`)) return;
    const ids = Array.from(selectedRowIds);
    try {
      await Promise.all(ids.map((id) => deleteDocument(workspaceId, id)));
      setRows((prev) => prev.filter((r) => !selectedRowIds.has(r.id)));
      setSelectedRowIds(new Set());
    } catch (e) {
      handleError(e, {
        customMessage: '삭제 중 오류가 발생했습니다.',
        showToast: true
      });
    }
  };

  // 셀 네비게이션 함수

  const scrollToCell = (rowId, propertyId, direction) => {
    const cellElement = document.querySelector(`[data-cell-id="${rowId}_${propertyId}"]`);
    if (!cellElement) return;

    const container = tableContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const cellRect = cellElement.getBoundingClientRect();
    
    // 셀의 상대적 위치 계산
    const cellTop = cellRect.top - containerRect.top + container.scrollTop;
    const cellBottom = cellTop + cellRect.height;
    const containerHeight = containerRect.height;
    const containerScrollTop = container.scrollTop;
    
    // 노션 스타일 스크롤: 위아래 마지막 두 번째 행에서만 조정
    if (direction === 'up' || direction === 'down') {
      const rowHeight = cellRect.height;
        const bufferRows = 1; // 스크롤 여백 행 수 (값을 변경해보세요: 1, 2, 3, 4, 5)
      const bufferHeight = rowHeight * bufferRows;
      
      let shouldScroll = false;
      let targetScrollTop = containerScrollTop;
      
      if (direction === 'up') {
        // 위로 이동 시: 셀이 화면 상단에서 bufferRows만큼의 여백보다 위에 있으면 스크롤
        const threshold = containerScrollTop + bufferHeight;
        if (cellTop <= threshold) { // <= 로 변경하여 더 민감하게
          shouldScroll = true;
          targetScrollTop = cellTop - bufferHeight;
        }
      } else if (direction === 'down') {
        // 아래로 이동 시: 셀이 화면 하단에서 bufferRows만큼의 여백보다 아래에 있으면 스크롤
        const threshold = containerScrollTop + containerHeight - bufferHeight;
        if (cellBottom >= threshold) { // >= 로 변경하여 더 민감하게
          shouldScroll = true;
          targetScrollTop = cellBottom - containerHeight + bufferHeight;
        }
      }
      
      if (shouldScroll) {
        // 스크롤 범위 제한
        targetScrollTop = Math.max(0, Math.min(targetScrollTop, container.scrollHeight - containerHeight));
        
        container.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
      }
    } else {
      // 좌우 이동 시에는 기존 방식 사용
      cellElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  };

  const navigateToCell = (currentRowId, currentPropertyId, direction) => {
    const currentRowIndex = finalFilteredRows.findIndex(row => row.id === currentRowId);
    if (currentRowIndex === -1) return;

    const currentRow = finalFilteredRows[currentRowIndex];
    const allCells = [
      { rowId: currentRow.id, propertyId: null }, // NameCell
      ...fetchedProperties.map(prop => ({ rowId: currentRow.id, propertyId: prop.id }))
    ];

    const currentCellIndex = allCells.findIndex(cell => 
      cell.rowId === currentRowId && cell.propertyId === currentPropertyId
    );

    if (currentCellIndex === -1) return;

    let targetCell = null;

    switch (direction) {
      case 'left':
        if (currentCellIndex > 0) {
          targetCell = allCells[currentCellIndex - 1];
        } else if (currentRowIndex > 0) {
          // 첫 번째 셀에서 좌측 이동 시 이전 행의 마지막 셀로
          const prevRow = finalFilteredRows[currentRowIndex - 1];
          const prevRowCells = [
            { rowId: prevRow.id, propertyId: null },
            ...fetchedProperties.map(prop => ({ rowId: prevRow.id, propertyId: prop.id }))
          ];
          targetCell = prevRowCells[prevRowCells.length - 1];
        }
        break;
      case 'right':
        if (currentCellIndex < allCells.length - 1) {
          targetCell = allCells[currentCellIndex + 1];
        } else if (currentRowIndex < finalFilteredRows.length - 1) {
          // 마지막 셀에서 우측 이동 시 다음 행의 첫 번째 셀로
          const nextRow = finalFilteredRows[currentRowIndex + 1];
          targetCell = { rowId: nextRow.id, propertyId: null };
        }
        break;
      case 'up':
        if (currentRowIndex > 0) {
          const prevRow = finalFilteredRows[currentRowIndex - 1];
          const prevRowCells = [
            { rowId: prevRow.id, propertyId: null },
            ...fetchedProperties.map(prop => ({ rowId: prevRow.id, propertyId: prop.id }))
          ];
          targetCell = prevRowCells[currentCellIndex] || prevRowCells[0];
        }
        break;
      case 'down':
        if (currentRowIndex < finalFilteredRows.length - 1) {
          const nextRow = finalFilteredRows[currentRowIndex + 1];
          const nextRowCells = [
            { rowId: nextRow.id, propertyId: null },
            ...fetchedProperties.map(prop => ({ rowId: nextRow.id, propertyId: prop.id }))
          ];
          targetCell = nextRowCells[currentCellIndex] || nextRowCells[0];
        }
        break;
    }

    if (targetCell) {
      setSelectedCell(targetCell);
      
      // 행 간 이동 시 스크롤 애니메이션 적용
      const targetRowIndex = finalFilteredRows.findIndex(row => row.id === targetCell.rowId);
      if (targetRowIndex !== currentRowIndex) {
        setTimeout(() => {
          scrollToCell(targetCell.rowId, targetCell.propertyId, direction);
        }, 50);
      }
    }
  };

  const handleCellKeyDown = (e, rowId, propertyId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setEditingCell({ rowId, propertyId });
      
      // 태그 속성인 경우 팝오버 위치 설정
      if (propertyId !== null) {
        const property = fetchedProperties.find(p => p.id === propertyId);
        if (property && property.type === 'TAG') {
          // 다음 렌더링 사이클에서 셀 위치를 가져오기 위해 setTimeout 사용
          setTimeout(() => {
            const cellElement = document.querySelector(`[data-cell-id="${rowId}_${propertyId}"]`);
            if (cellElement) {
              const rect = cellElement.getBoundingClientRect();
              // getBoundingClientRect()는 뷰포트 기준 좌표를 반환하므로
              // position: fixed를 사용하는 팝오버에 그대로 사용 가능
              setTagPopoverRect({ 
                top: rect.top, 
                left: rect.left, 
                width: rect.width, 
                height: rect.height 
              });
            }
          }, 0);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCell(null);
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      const direction = e.key.replace('Arrow', '').toLowerCase();
      navigateToCell(rowId, propertyId, direction);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      navigateToCell(rowId, propertyId, 'right');
    }
  };

  const handleCellClick = useCallback((rowId, propertyId) => {
    setSelectedCell({ rowId, propertyId });
    // 마우스 클릭 시 바로 편집 모드로 진입 (시스템 속성 제외)
    if (propertyId === null || !SYSTEM_PROP_TYPES.includes(fetchedProperties.find(p => p.id === propertyId)?.type)) {
      setEditingCell({ rowId, propertyId });
    }
  }, [fetchedProperties]);

  return (
    <div className="px-20 min-w-0">
      {/* 에러 메시지 표시 */}
      {error && (
        <div className="mb-4">
          <ErrorMessage 
            error={error} 
            onRetry={() => {
              clearError();
              // 필요시 데이터 다시 로드
            }}
            onDismiss={clearError}
            variant="error"
          />
        </div>
      )}
      
      {/* 테이블 + 툴바 컨테이너 - 가로 스크롤 영역 */}
      <div ref={tableContainerRef} className="relative" style={{ minWidth: 'max-content', marginTop: hasActiveSorts ? '40px' : '0' }}>
        {/* 가로 스크롤 대응 툴바 */}
        <TableToolbar
          onAddNewDocument={handleAddNewDocument}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
          clearSearch={clearSearch}
          properties={fetchedProperties}
          onFilterAdd={addFilter}
          activeFilters={activeFilters}
          onFilterRemove={removeFilter}
          activeSorts={activeSorts}
          onSortAdd={addSort}
          onSortUpdate={updateSort}
          onSortRemove={removeSort}
          isReadOnly={isReadOnly}
          anchorRef={tableContainerRef}
          documentCount={finalFilteredRows.length}
          isOwner={isOwner}
          workspaceId={workspaceId}
          documentId={documentId}
          getSortedDocumentIds={getSortedDocumentIds}
        />
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={isReadOnly ? undefined : handleColumnDragEnd}>
          <TableHeader
            colWidths={colWidths}
            properties={propertiesForRender}
            handleResizeMouseDown={handleResizeMouseDown}
            editingHeader={editingHeader}
            setEditingHeader={setEditingHeader}
            handleDeleteProperty={handleDeleteProperty}
            handleHeaderNameChange={handleHeaderNameChange}
            addBtnRef={addBtnRef}
            isPopoverOpen={isPopoverOpen}
            setIsPopoverOpen={setIsPopoverOpen}
            AddPropertyPopoverComponent={() => (isReadOnly ? null : <AddPropertyPopover onAddProperty={handleAddProperty} />)}
            isReadOnly={isReadOnly}
            // selection controls
            isAllSelected={finalFilteredRows.length > 0 && selectedRowIds.size === finalFilteredRows.length}
            isSomeSelected={selectedRowIds.size > 0 && selectedRowIds.size < finalFilteredRows.length}
            onToggleAll={() => {
              if (selectedRowIds.size === finalFilteredRows.length) {
                setSelectedRowIds(new Set());
              } else {
                setSelectedRowIds(new Set(finalFilteredRows.map(r => r.id)));
              }
            }}
          />
        </DndContext>
        <div className="relative">
          {selectedRowIds.size > 0 && (
            <div className="flex absolute gap-2 items-center px-3 py-1 bg-white rounded border shadow-sm" style={{ top: hasActiveSorts ? -100 : -72 }}>
              <span className="text-sm text-gray-600">{selectedRowIds.size}개 선택됨</span>
              <button className="inline-flex gap-1 items-center text-red-600 hover:text-red-700" onClick={handleBulkDelete}>
                <Trash2 size={14} /> 삭제
              </button>
            </div>
          )}
          {isLoading && <div className="flex justify-center items-center h-10 text-gray-400">로딩 중...</div>}
          {error && <div className="flex justify-center items-center h-10 text-red-500">데이터 로딩 중 오류 발생: {error.message}</div>}
          {finalFilteredRows.length === 0 && !isLoading && !error ? (
            <div className="flex items-center h-10 text-gray-400">
              {hasActiveSearch || hasActiveFilters ? '검색 결과 없음' : '빈 행'}
            </div>
          ) : (
            // 무한 스크롤 테이블 사용
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={isReadOnly ? undefined : handleRowDragEnd}>
              <SortableContext items={visibleRows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                {visibleRows.map((row, rowIdx) => (
                  <TableRow
                    key={row.id}
                    row={row}
                    rowIdx={rowIdx}
                    properties={propertiesForRender}
                    colWidths={colWidths}
                    editingCell={editingCell}
                    hoveredCell={hoveredCell}
                    setEditingCell={setEditingCell}
                    setHoveredCell={setHoveredCell}
                    handleCellValueChange={isReadOnly ? () => {} : handleCellValueChange}
                    onOpenRow={(r) => {
                      const slug = slugify(r.title || '제목 없음');
                      navigate(`/${r.id}-${slug}`);
                    }}
                    systemPropTypes={SYSTEM_PROP_TYPES}
                    tagCellRefs={tagCellRefs}
                    tagPopoverRect={tagPopoverRect}
                    setTagPopoverRect={setTagPopoverRect}
                    onTagOptionsUpdate={(property, updatedTagOptions) => {
                      if (!isReadOnly) {
                        setFetchedProperties((prev) =>
                          prev.map((p) => (p.id === property.id ? { ...p, tagOptions: updatedTagOptions } : p))
                        );
                        setRows((prev) =>
                          prev.map((rowItem) => {
                            if (!(property.id in rowItem.values)) {
                              return { ...rowItem, values: { ...rowItem.values, [property.id]: '' } };
                            }
                            return rowItem;
                          })
                        );
                      }
                    }}
                    isSelected={selectedRowIds.has(row.id)}
                    onToggleSelect={toggleSelect}
                    isReadOnly={isReadOnly}
                    selectedCell={selectedCell}
                    onCellClick={handleCellClick}
                    onCellKeyDown={handleCellKeyDown}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
        <div className="py-2">
          {!isReadOnly && (
            <button 
              className="px-2 py-1 text-sm font-semibold text-gray-400 rounded hover:bg-gray-100"
              onClick={handleAddRowBottom}
            >
              + 새 문서
            </button>
          )}
        </div>
        {/* 문서 개수 표시 */}
        <div 
          className="relative py-1 text-sm text-gray-500"
          style={{ 
            width: colWidths[0] || 0, // NameCell의 너비와 동일하게 설정
            boxSizing: 'border-box' // 패딩을 포함한 너비 계산
          }}
        >
        <span className="absolute right-2 top-1/2 -translate-y-1/2">
          개수 {finalFilteredRows.length}
        </span>
        </div>
      </div>

      {/* 무한 스크롤 센티넬 (푸터 여백 영향 방지용 항상 표시) */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center items-center py-6 text-gray-500 min-h-[1px]">
          {isFetchingMore && (
            <>
              <div className="mr-2 w-6 h-6 rounded-full border-b-2 border-blue-600 animate-spin"></div>
              <span>더 많은 문서를 불러오는 중...</span>
            </>
          )}
        </div>
      )}

      {/* 정렬 제거 확인 모달 */}
      <Dialog open={showSortClearModal} onOpenChange={setShowSortClearModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">정렬을 제거하시겠습니까?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:flex-col sm:space-x-0">
            <Button 
              variant="outline"
              onClick={handleSortClearConfirm}
              className="border border-red-300 hover:text-red-700 hover:bg-red-100"
            >
              제거
            </Button>
            <Button variant="outline" onClick={handleSortClearCancel}>
              제거하지 않음
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 

export default DocumentTableView;