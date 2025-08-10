import React from 'react';

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
  isSelected,
}) {
  const rowId = row.id;
  const propertyId = null;
  const isEditing = editingCell && editingCell.rowId === rowId && editingCell.propertyId === propertyId;
  const isHovered = hoveredCell && hoveredCell.rowId === rowId && hoveredCell.propertyId === propertyId;
  const value = row.title;

  return (
    <div
      className={`flex relative items-center h-full notion-table-view-cell ${isSelected ? 'bg-blue-50' : ''}`}
      style={{
        width: colWidth,
        minWidth: 80,
        minHeight: '36px',
        fontSize: '14px',
        borderTop: rowIdx === 0 ? '1px solid #e9e9e7' : 'none',
        borderBottom: '1px solid #e9e9e7',
        borderRight: '1px solid #e9e9e7',
        borderLeft: 'none',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        background: isEditing ? '#e9e9e7' : undefined,
        cursor: isEditing ? 'text' : 'pointer',
      }}
      onClick={() => setEditingCell({ rowId, propertyId: null })}
      onMouseEnter={() => setHoveredCell({ rowId, propertyId: null })}
      onMouseLeave={() => setHoveredCell(null)}
    >
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
}

export default NameCell;

