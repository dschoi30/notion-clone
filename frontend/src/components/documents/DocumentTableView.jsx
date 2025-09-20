import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
  
  const systemPropTypeMap = useMemo(() => buildSystemPropTypeMapForTable(), []);
  
  // 에러 처리 훅
  const { handleError, clearError } = useErrorHandler();
  
  // 소유자 확인
  const { user } = useAuth();
  const { currentDocument } = useDocument();
  const isOwner = currentDocument && String(currentDocument.userId) === String(user?.id);

  // data hook
  const {
    properties: fetchedProperties,
    setProperties: setFetchedProperties,
    rows,
    setRows,
    isLoading,
    error,
    editingHeader,
    setEditingHeader,
    handleAddProperty,
    handleDeleteProperty,
    handleAddRowTop,
    handleAddRowBottom,
    handleCellValueChange,
    handleHeaderNameChange,
  } = useTableData({ workspaceId, documentId, systemPropTypeMap });

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
  const propertiesForRender = fetchedProperties;
  
  // 최종 필터링된 데이터 (검색 + 필터 + 정렬 적용)
  const finalFilteredRows = sortedRows;

  // 상단 툴바에서 새 문서 추가 (첫 번째 행에 추가)
  const handleAddNewDocument = async () => {
    await handleAddRowTop();
  };

  const toggleSelect = (rowId) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const handleRowDragEnd = async (event) => {
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
  };

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
        console.log(`UP: cellTop=${cellTop}, threshold=${threshold}, bufferRows=${bufferRows}`);
        if (cellTop <= threshold) { // <= 로 변경하여 더 민감하게
          shouldScroll = true;
          targetScrollTop = cellTop - bufferHeight;
          console.log(`UP 스크롤 실행: targetScrollTop=${targetScrollTop}`);
        }
      } else if (direction === 'down') {
        // 아래로 이동 시: 셀이 화면 하단에서 bufferRows만큼의 여백보다 아래에 있으면 스크롤
        const threshold = containerScrollTop + containerHeight - bufferHeight;
        console.log(`DOWN: cellBottom=${cellBottom}, threshold=${threshold}, bufferRows=${bufferRows}`);
        if (cellBottom >= threshold) { // >= 로 변경하여 더 민감하게
          shouldScroll = true;
          targetScrollTop = cellBottom - containerHeight + bufferHeight;
          console.log(`DOWN 스크롤 실행: targetScrollTop=${targetScrollTop}`);
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

  const handleCellClick = (rowId, propertyId) => {
    setSelectedCell({ rowId, propertyId });
    // 마우스 클릭 시 바로 편집 모드로 진입 (시스템 속성 제외)
    if (propertyId === null || !SYSTEM_PROP_TYPES.includes(fetchedProperties.find(p => p.id === propertyId)?.type)) {
      setEditingCell({ rowId, propertyId });
    }
  };

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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={isReadOnly ? undefined : handleRowDragEnd}>
              <SortableContext items={finalFilteredRows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                {finalFilteredRows.map((row, rowIdx) => (
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
            <Button size="sm" variant="ghost" onClick={handleAddRowBottom}>+ 새 문서</Button>
          )}
        </div>
      </div>

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