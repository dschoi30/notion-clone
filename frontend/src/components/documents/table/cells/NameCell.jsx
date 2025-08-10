import React from 'react';
import { Text, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

function NameCell({
  row,
  rowIdx,
  colWidth,
  editingCell,
  hoveredCell,
  setEditingCell,
  setHoveredCell,
  handleCellValueChange,
  onOpenRow,
  dragAttributes,
  dragListeners,
  isRowDragging,
  isSelected,
  onToggleSelect,
}) {
  const rowId = row.id;
  const propertyId = null;
  const isEditing = editingCell && editingCell.rowId === rowId && editingCell.propertyId === propertyId;
  const isHovered = hoveredCell && hoveredCell.rowId === rowId && hoveredCell.propertyId === propertyId;
  const value = row.title;

  return (
    <div
      className="flex relative items-center h-full notion-table-view-cell"
      style={{
        width: colWidth,
        minWidth: 80,
        minHeight: '36px',
        fontSize: '14px',
        paddingLeft: 28,
        borderTop: rowIdx === 0 ? '1px solid #e9e9e7' : 'none',
        borderBottom: '1px solid #e9e9e7',
        borderRight: '1px solid #e9e9e7',
        borderLeft: 'none',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        background: isEditing ? '#e9e9e7' : isHovered ? '#f5f5f5' : 'transparent',
        cursor: isEditing ? 'text' : 'pointer',
      }}
      onClick={() => setEditingCell({ rowId, propertyId: null })}
      onMouseEnter={() => setHoveredCell({ rowId, propertyId: null })}
      onMouseLeave={() => setHoveredCell(null)}
    >
      {/* 좌측 레일: 체크박스 + 드래그 핸들 */}
      <div
        className="absolute left-0 top-0 h-full flex items-center gap-1 pl-1 pr-1 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox checked={!!isSelected} onCheckedChange={() => onToggleSelect(rowId)} />
        <button
          type="button"
          className="cursor-move text-gray-400 hover:text-gray-600"
          aria-label="drag handle"
          {...dragAttributes}
          {...dragListeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </button>
      </div>
      {isEditing ? (
        <input
          autoFocus
          className="px-2 w-full h-full rounded border outline-none"
          style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
          value={value}
          onChange={(e) => handleCellValueChange(rowId, null, e.target.value)}
          onBlur={() => setEditingCell(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setEditingCell(null);
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

export default NameCell;

