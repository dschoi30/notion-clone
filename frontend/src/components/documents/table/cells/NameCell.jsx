import React, { useEffect, useRef, memo } from 'react';

const NameCell = memo(function NameCell({
  row,
  rowIdx,
  colWidth,
  editingCell,
  hoveredCell,
  setEditingCell,
  setHoveredCell,
  handleCellValueChange,
  onOpenRow,
  isSelected,
  isReadOnly = false,
  selectedCell,
  onCellClick,
  onCellKeyDown,
}) {
  const rowId = row.id;
  const propertyId = null;
  const isEditing = editingCell && editingCell.rowId === rowId && editingCell.propertyId === propertyId;
  const isHovered = hoveredCell && hoveredCell.rowId === rowId && hoveredCell.propertyId === propertyId;
  const isCellSelected = selectedCell && selectedCell.rowId === rowId && selectedCell.propertyId === propertyId;
  const value = row.title;
  const cellRef = useRef(null);

  // 셀이 선택되면 자동으로 포커스 설정
  useEffect(() => {
    if (isCellSelected && cellRef.current && !isEditing) {
      cellRef.current.focus();
    }
  }, [isCellSelected, isEditing]);

  return (
    <div
      ref={cellRef}
      data-cell-id={`${rowId}_${propertyId}`}
      className={`flex relative items-center h-full notion-table-view-cell ${isSelected ? 'bg-blue-50' : ''} focus:outline-none`}
      style={{
        width: colWidth,
        minWidth: 80,
        minHeight: '36px',
        fontSize: '14px',
        borderTop: isCellSelected ? '2px solid #3b82f6' : (rowIdx === 0 ? '1px solid #e9e9e7' : 'none'),
        borderBottom: isCellSelected ? '2px solid #3b82f6' : '1px solid #e9e9e7',
        borderRight: isCellSelected ? '2px solid #3b82f6' : '1px solid #e9e9e7',
        borderLeft: isCellSelected ? '2px solid #3b82f6' : 'none',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        background: isEditing ? '#e9e9e7' : isCellSelected ? '#f0f8ff' : undefined,
        cursor: isReadOnly ? 'default' : isEditing ? 'text' : 'pointer',
        outline: 'none',
      }}
      onClick={() => { 
        if (!isReadOnly) {
          onCellClick(rowId, propertyId);
        }
      }}
      onMouseEnter={() => setHoveredCell({ rowId, propertyId: null })}
      onMouseLeave={() => setHoveredCell(null)}
      onKeyDown={(e) => {
        if (!isReadOnly) {
          onCellKeyDown(e, rowId, propertyId);
        }
      }}
      tabIndex={isCellSelected ? 0 : -1}
    >
      {isEditing ? (
        <input
          autoFocus
          className="px-2 w-full h-full border outline-none"
          value={value}
          onChange={(e) => !isReadOnly && handleCellValueChange(rowId, null, e.target.value)}
          onBlur={() => setEditingCell(null)}
          onKeyDown={(e) => {
            if (['Enter', 'Escape'].includes(e.key)) {
              setEditingCell(null);
            } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.key)) {
              e.preventDefault();
              setEditingCell(null);
              onCellKeyDown(e, rowId, propertyId);
            }
        }}
        />
      ) : (
        <>
          <span className="px-2 text-gray-700" style={{ width: '100%', minHeight: 20, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap', fontWeight: 600 }}>
            {value}
          </span>
          {isHovered && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenRow(row);
              }}
              className="absolute right-2 top-1/2 px-2 py-1 text-xs rounded border border-gray-300 transition -translate-y-1/2 hover:bg-gray-100"
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
});

export default NameCell;

