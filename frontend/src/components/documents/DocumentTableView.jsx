import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocument } from '@/contexts/DocumentContext';
import { Button } from '@/components/ui/button';
import AddPropertyPopover from './AddPropertyPopover';
import { useDocumentPropertiesStore } from '@/hooks/useDocumentPropertiesStore';
import { formatKoreanDateTime } from '@/lib/utils';
import { getColorObj } from '@/lib/colors';
import DatePopover from './DatePopover';
import TagPopover from './TagPopover';
import { createRef } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { updateChildDocumentOrder, deleteDocument } from '@/services/documentApi';
import { Trash2 } from 'lucide-react';
import TableHeader from './table/TableHeader';
import TableRow from './table/TableRow';
import { slugify } from './table/utils.jsx';
import { useColumnDnd } from './table/hooks/useColumnDnd';
import { useColumnResize } from './table/hooks/useColumnResize';
import { useTableData } from './table/hooks/useTableData';

// moved to ./table/utils

// moved to ./table/SortablePropertyHeader.jsx

const DocumentTableView = ({ workspaceId, documentId, parentProps}) => {
  const navigate = useNavigate(); // useNavigate 훅 추가
  const [properties, setProperties] = useState(parentProps || []); // keep initial props until hook fetch
  const [editingCell, setEditingCell] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const addBtnRef = useRef(null);
  const tagCellRefs = useRef({}); // {rowId_propertyId: ref}
  const [tagPopoverRect, setTagPopoverRect] = useState(null);
  const defaultWidth = 192; // 12rem
  
  const systemPropTypeMap = {
    CREATED_BY: (row) => row.document?.createdBy || '',
    LAST_UPDATED_BY: (row) => row.document?.updatedBy || '',
    CREATED_AT: (row) => row.document?.createdAt || '',
    LAST_UPDATED_AT: (row) => row.document?.updatedAt || '',
  };

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
    handleAddRow,
    handleCellValueChange,
    handleHeaderNameChange,
  } = useTableData({ workspaceId, documentId, systemPropTypeMap });

  useEffect(() => {
    if (parentProps && parentProps.length > 0) {
      setFetchedProperties(parentProps);
    }
  }, [parentProps?.length]);

  // column resize
  const storeProperties = useDocumentPropertiesStore((state) => state.properties);
  const titleWidth = useDocumentPropertiesStore((state) => state.titleWidth);
  const updateTitleWidth = useDocumentPropertiesStore((state) => state.updateTitleWidth);
  const propertyWidths = storeProperties.map((p) => p.width ?? defaultWidth);
  const { colWidths, handleResizeMouseDown } = useColumnResize({
    properties: fetchedProperties,
    titleWidth,
    propertyWidths,
    workspaceId,
    documentId,
    updateTitleWidthFn: updateTitleWidth,
  });

  // column dnd
  const { sensors, handleColumnDragEnd } = useColumnDnd({
    properties: fetchedProperties,
    setProperties: setFetchedProperties,
    workspaceId,
    documentId,
  });
  
  // (removed) inline resize logic moved to hook

  const propertiesForRender = fetchedProperties && fetchedProperties.length > 0 ? fetchedProperties : properties;

  // (removed) inline table data/handlers moved to hook

  const SYSTEM_PROP_TYPES = ['CREATED_BY', 'LAST_UPDATED_BY', 'CREATED_AT', 'LAST_UPDATED_AT'];

  const cellRefs = useRef({}); // {rowId_propertyId: ref}
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());

  const { currentDocument, selectDocument } = useDocument();
  const { currentWorkspace } = useWorkspace();
  const fetchProperties = useDocumentPropertiesStore(state => state.fetchProperties);
  const setDocumentId = useDocumentPropertiesStore(state => state.setDocumentId);

  useEffect(() => {
    if (currentWorkspace && currentDocument) {
      fetchProperties(currentWorkspace.id, currentDocument.id);
      setDocumentId(currentDocument.id);
    }
  }, [currentWorkspace, currentDocument, fetchProperties, setDocumentId]);

  // (removed) inline fetch logic moved to hook

  const toggleSelect = (rowId) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      // 전체 선택 상태 유지 규칙: 일부만 선택되면 헤더 체크 해제(헤더는 props로 파생)
      return next;
    });
  };

  const handleRowDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const newRows = [...rows];
    const [moved] = newRows.splice(oldIndex, 1);
    newRows.splice(newIndex, 0, moved);
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

  const renderCell = (row, property, idx, isNameCell = false, rowIdx = 0) => {
    const rowId = row.id;
    const propertyId = isNameCell ? null : property?.id;
    const isEditing = editingCell && editingCell.rowId === rowId && editingCell.propertyId === propertyId;
    const isHovered = hoveredCell && hoveredCell.rowId === rowId && hoveredCell.propertyId === propertyId;
    let value = isNameCell ? row.title : (property ? row.values[property.id] || '' : '');
    let content = value;
    // 이름 셀(타이틀 셀) 처리
    if (isNameCell) {
      return (
        <div
          key={'name'}
          className="flex relative items-center h-full notion-table-view-cell"
          style={{
            width: colWidths[0],
            minWidth: 80,
            minHeight: '36px',
            fontSize: '14px',
            borderTop: rowIdx === 0 ? '1px solid #e9e9e7' : 'none',
            borderBottom: '1px solid #e9e9e7',
            borderRight: '1px solid #e9e9e7',
            borderLeft: 'none',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            background: isEditing
              ? '#e9e9e7'
              : isHovered
              ? '#f5f5f5'
              : 'transparent',
            cursor: isEditing ? 'text' : 'pointer',
          }}
          onClick={() => {
            setEditingCell({ rowId, propertyId: null });
          }}
          onMouseEnter={() => setHoveredCell({ rowId, propertyId: null })}
          onMouseLeave={() => setHoveredCell(null)}
        >
          {isEditing ? (
            <input
              autoFocus
              className="px-2 w-full h-full rounded border outline-none"
              style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
              value={value}
              onChange={e => handleCellValueChange(rowId, null, e.target.value)}
              onBlur={() => setEditingCell(null)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingCell(null); }}
            />
          ) : (
            <>
              <span className="px-2 text-gray-700" style={{ width: '100%', minHeight: 20, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',  whiteSpace: 'nowrap', fontWeight: 600 }}>{value}</span>
              {isHovered && (
                <button
                  type="button"
                  onClick={async e => {
                    e.stopPropagation();
                    try {
                      // 먼저 문서 정보를 가져와서 slug 생성
                      const targetRow = rows.find(r => r.id === rowId);
                      if (targetRow) {
                        const slug = slugify(targetRow.title || 'untitled');
                        // URL 형식: /:id-:slug
                        navigate(`/${rowId}-${slug}`);
                      }
                    } catch (err) {
                      console.error('문서 열기 실패:', err);
                    }
                  }}
                  className="absolute right-2 top-1/2 px-2 py-1 text-xs rounded border border-gray-300 transition -translate-y-1/2 hover:bg-gray-200"
                  style={{ zIndex: 20 }}
                  title="문서 열기"
                >
                  열기
                </button>
              )}
            </>
          )}
        </div>
      );
    }
    // property가 null이 아니어야 아래 처리 진행
    if (!property) return null;
    // 날짜/시간 포맷 적용
    if (property.type === 'CREATED_AT' || property.type === 'LAST_UPDATED_AT') {
      content = formatKoreanDateTime(value);
    }
    // TAG 타입은 pill로 렌더링
    if (property.type === 'TAG') {
      let tags = [];
      try { tags = value ? JSON.parse(value) : []; } catch {}
      const tagOptions = property.tagOptions || [];
      const cellKey = `${rowId}_${property.id}`;
      content = (
        <div
          ref={el => { if (property.type === 'TAG'){
            tagCellRefs.current[cellKey] = el;
          }
        }}
          className="flex gap-1 items-center"
          style={{ minWidth: 0, minHeight: 32, overflow: 'hidden', whiteSpace: 'nowrap', flexWrap: 'nowrap' }}
          onClick={e => {
            if (!SYSTEM_PROP_TYPES.includes(property.type)) {
              const rect = tagCellRefs.current[cellKey]?.getBoundingClientRect();
              if (rect && rect.width > 0 && rect.height > 0) {
                setTagPopoverRect({
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                });
                setEditingCell({ rowId, propertyId });
              }
            }
          }}
        >
          {tags.map(tagId => {
            const tagObj = tagOptions.find(opt => opt.id === tagId);
            if (!tagObj) return null;
            const colorObj = getColorObj(tagObj.color || 'default');
            return (
              <span
                key={tagObj.id}
                className={`inline-flex items-center px-2 py-0.5 rounded text-sm ${colorObj.bg} border ${colorObj.border}`}
                style={{
                  whiteSpace: 'nowrap',
                  maxWidth: 120,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'inline-table',
                  width: 'auto',
                  minWidth: 0
                }}
              >
                {tagObj.label}
              </span>
            );
          })}
        </div>
      );
    }
    const isSystemProp = SYSTEM_PROP_TYPES.includes(property.type);
    // ref 생성 및 저장
    const cellKey = `${rowId}_${propertyId}`;
    if (!cellRefs.current[cellKey]) cellRefs.current[cellKey] = createRef();
    return (
      <div
        key={isNameCell ? 'name' : property.id}
        ref={cellRefs.current[cellKey]}
        className="flex relative items-center h-full notion-table-view-cell"
        style={{
          width: colWidths[isNameCell ? 0 : 1 + idx],
          minWidth: 80,
          minHeight: '36px',
          fontSize: '14px',
          borderTop: rowIdx === 0 ? '1px solid #e9e9e7' : 'none',
          borderBottom: '1px solid #e9e9e7',
          borderRight: '1px solid #e9e9e7',
          borderLeft: 'none',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          background: (editingCell && editingCell.rowId === rowId && editingCell.propertyId === propertyId)
            ? '#e9e9e7'
            : (hoveredCell && hoveredCell.rowId === rowId && hoveredCell.propertyId === propertyId)
            ? '#f5f5f5'
            : 'transparent',
          cursor: (editingCell && editingCell.rowId === rowId && editingCell.propertyId === propertyId)
            ? (SYSTEM_PROP_TYPES.includes(property?.type) ? 'default' : 'text')
            : (SYSTEM_PROP_TYPES.includes(property?.type) ? 'default' : 'pointer'),
        }}
        onClick={() => {
          if (isNameCell) {
            setEditingCell({ rowId, propertyId: null });
          } else if (!SYSTEM_PROP_TYPES.includes(property.type)) {
            setEditingCell({ rowId, propertyId });
          }
        }}
        onMouseEnter={() => setHoveredCell({ rowId, propertyId })}
        onMouseLeave={() => setHoveredCell(null)}
      >
        {isEditing && !isSystemProp ? (
          property.type === 'TEXT' ? (
            <input
              autoFocus
              className="px-2 w-full h-full rounded border outline-none"
              style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
              value={value}
              onChange={e => handleCellValueChange(rowId, propertyId, e.target.value)}
              onBlur={() => setEditingCell(null)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingCell(null); }}
            />
          ) : property.type === 'NUMBER' ? (
            <input
              type="number"
              autoFocus
              className="px-2 py-1 w-full h-full rounded border outline-none"
              style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
              value={value}
              onChange={e => handleCellValueChange(rowId, propertyId, e.target.value)}
              onBlur={() => setEditingCell(null)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingCell(null); }}
            />
          ) : property.type === 'DATE' ? (
            <DatePopover
              value={value}
              onChange={val => handleCellValueChange(rowId, propertyId, val)}
              onClose={() => setEditingCell(null)}
            />
          ) : property.type === 'TAG' ? (
            <TagPopover
              propertyId={property.id}
              value={value}
              tagOptions={property.tagOptions}
              onChange={val => {
                handleCellValueChange(rowId, property.id, val);
              }}
              onTagOptionsUpdate={async (updatedTagOptions) => {
                setFetchedProperties(prev => prev.map(p => 
                  p.id === property.id ? { ...p, tagOptions: updatedTagOptions } : p
                ));
                
                // 모든 행에 해당 property의 빈 값 추가 (없는 경우에만)
                setRows(prev => prev.map(row => {
                  if (!(property.id in row.values)) {
                    return { ...row, values: { ...row.values, [property.id]: '' } };
                  }
                  return row;
                }));
              }}
              onClose={() => {
                handleCellValueChange(rowId, property.id, value);
                setEditingCell(null); 
                setTagPopoverRect(null);
              }}
              position={tagPopoverRect}
            />
          ) : null
        ) : (
          <span className="block overflow-hidden px-2 w-full whitespace-nowrap min-h-5 text-ellipsis">
            {content}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="px-20 space-y-4 min-w-0">
      {/* 테이블 UI */}
      <div style={{ minWidth: 'max-content' }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColumnDragEnd}>
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
            AddPropertyPopoverComponent={() => <AddPropertyPopover onAddProperty={handleAddProperty} />}
            // selection controls
            isAllSelected={rows.length > 0 && selectedRowIds.size === rows.length}
            isSomeSelected={selectedRowIds.size > 0 && selectedRowIds.size < rows.length}
            onToggleAll={() => {
              if (selectedRowIds.size === rows.length) {
                setSelectedRowIds(new Set());
              } else {
                setSelectedRowIds(new Set(rows.map(r => r.id)));
              }
            }}
          />
        </DndContext>
        <div className="relative">
          {selectedRowIds.size > 0 && (
            <div className="absolute flex items-center gap-2 bg-white border rounded px-3 py-1 shadow-sm" style={{ top: -72 }}>
              <span className="text-sm text-gray-600">{selectedRowIds.size}개 선택됨</span>
              <button className="text-red-600 hover:text-red-700 inline-flex items-center gap-1" onClick={handleBulkDelete}>
                <Trash2 size={14} /> 삭제
              </button>
            </div>
          )}
          {isLoading && <div className="flex justify-center items-center h-10 text-gray-400">로딩 중...</div>}
          {error && <div className="flex justify-center items-center h-10 text-red-500">데이터 로딩 중 오류 발생: {error.message}</div>}
          {rows.length === 0 && !isLoading && !error ? (
            <div className="flex items-center h-10 text-gray-400">빈 행</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRowDragEnd}>
              <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                {rows.map((row, rowIdx) => (
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
                    handleCellValueChange={handleCellValueChange}
                    onOpenRow={(r) => {
                      const slug = slugify(r.title || 'untitled');
                      navigate(`/${r.id}-${slug}`);
                    }}
                    systemPropTypes={SYSTEM_PROP_TYPES}
                    tagCellRefs={tagCellRefs}
                    tagPopoverRect={tagPopoverRect}
                    setTagPopoverRect={setTagPopoverRect}
                    onTagOptionsUpdate={(property, updatedTagOptions) => {
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
                    }}
                    isSelected={selectedRowIds.has(row.id)}
                    onToggleSelect={toggleSelect}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
        <div className="py-2">
          <Button size="sm" variant="ghost" onClick={handleAddRow}>+ 새 페이지</Button>
        </div>
      </div>
    </div>
  );
} 

export default DocumentTableView;