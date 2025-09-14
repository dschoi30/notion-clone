import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { DEFAULT_PROPERTY_WIDTH, SYSTEM_PROP_TYPES } from '@/components/documents/shared/constants';
import { buildSystemPropTypeMapForTable } from '@/components/documents/shared/systemPropTypeMap';

const DocumentTableView = ({ workspaceId, documentId, isReadOnly = false }) => {
  const navigate = useNavigate(); // useNavigate 훅 추가
  const [editingCell, setEditingCell] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const addBtnRef = useRef(null);
  const tagCellRefs = useRef({}); // {rowId_propertyId: ref}
  const tableContainerRef = useRef(null);
  const [tagPopoverRect, setTagPopoverRect] = useState(null);
  
  const systemPropTypeMap = useMemo(() => buildSystemPropTypeMapForTable(), []);

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
    hasActiveSorts
  } = useTableSort(filterFilteredRows);

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
      alert('행 순서 변경에 실패했습니다. 다시 시도해주세요.');
    }
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
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="px-20 min-w-0">
      {/* 테이블 + 툴바 컨테이너 - 가로 스크롤 영역 */}
      <div ref={tableContainerRef} className="relative" style={{ minWidth: 'max-content' }}>
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
            <div className="flex absolute gap-2 items-center px-3 py-1 bg-white rounded border shadow-sm" style={{ top: -72 }}>
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
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
        <div className="py-2">
          {!isReadOnly && (
            <Button size="sm" variant="ghost" onClick={handleAddRowBottom}>+ 새 페이지</Button>
          )}
        </div>
      </div>
    </div>
  );
} 

export default DocumentTableView;