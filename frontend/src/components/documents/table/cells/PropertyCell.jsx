import React, { createRef } from 'react';
import DatePopover from '../../DatePopover';
import TagPopover from '../../TagPopover';
import { formatKoreanDateSmart } from '@/lib/utils';
import { getColorObj } from '@/lib/colors';

function PropertyCell({
  row,
  property,
  idx,
  rowIdx,
  colWidth,
  editingCell,
  hoveredCell,
  setEditingCell,
  setHoveredCell,
  handleCellValueChange,
  systemPropTypes,
  tagCellRefs,
  tagPopoverRect,
  setTagPopoverRect,
  onTagOptionsUpdate,
  isSelected,
}) {
  const rowId = row.id;
  const propertyId = property?.id;
  const isEditing = editingCell && editingCell.rowId === rowId && editingCell.propertyId === propertyId;
  const isHovered = hoveredCell && hoveredCell.rowId === rowId && hoveredCell.propertyId === propertyId;
  const isSystemProp = systemPropTypes.includes(property.type);
  const value = property ? row.values[property.id] || '' : '';
  let content = value;

  // 시스템 속성은 row.document 메타데이터를 우선 사용(표시 일관성)
  if (property.type === 'CREATED_AT') {
    const v = row?.document?.createdAt || value;
    content = formatKoreanDateSmart(v);
  } else if (property.type === 'LAST_UPDATED_AT') {
    const v = row?.document?.updatedAt || value;
    content = formatKoreanDateSmart(v);
  } else if (property.type === 'CREATED_BY') {
    content = row?.document?.createdBy || value || '';
  } else if (property.type === 'LAST_UPDATED_BY') {
    content = row?.document?.updatedBy || value || '';
  } else if (property.type === 'DATE') {
    content = formatKoreanDateSmart(value);
  }

  if (property.type === 'TAG') {
    let tags = [];
    try {
      tags = value ? JSON.parse(value) : [];
    } catch {}
    const tagOptions = property.tagOptions || [];
    const cellKey = `${rowId}_${property.id}`;
    content = (
      <div
        className="flex gap-1 items-center"
        style={{ minWidth: 0, minHeight: 32, overflow: 'hidden', whiteSpace: 'nowrap', flexWrap: 'nowrap' }}
        onClick={() => {
          if (!isSystemProp) {
            const rect = tagCellRefs.current[cellKey]?.current?.getBoundingClientRect();
            if (rect && rect.width > 0 && rect.height > 0) {
              setTagPopoverRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
              setEditingCell({ rowId, propertyId });
            }
          }
        }}
      >
        {tags.map((tagId) => {
          const tagObj = tagOptions.find((opt) => opt.id === tagId);
          if (!tagObj) return null;
          const colorObj = getColorObj(tagObj.color || 'default');
          return (
            <span
              key={tagObj.id}
              className={`inline-flex items-center px-2 py-0.5 rounded text-sm ${colorObj.bg} border ${colorObj.border}`}
              style={{ whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-table', width: 'auto', minWidth: 0 }}
            >
              {tagObj.label}
            </span>
          );
        })}
      </div>
    );
  }

  const cellKey = `${rowId}_${propertyId}`;
  if (!tagCellRefs.current[cellKey]) tagCellRefs.current[cellKey] = createRef();

  return (
    <div
      key={property.id}
      ref={tagCellRefs.current[cellKey]}
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
        cursor: isEditing ? (isSystemProp ? 'default' : 'text') : isSystemProp ? 'default' : 'pointer',
      }}
      onClick={() => {
        if (!isSystemProp) setEditingCell({ rowId, propertyId });
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
            onChange={(e) => handleCellValueChange(rowId, propertyId, e.target.value)}
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEditingCell(null);
            }}
          />
        ) : property.type === 'NUMBER' ? (
          <input
            type="number"
            autoFocus
            className="px-2 py-1 w-full h-full rounded border outline-none"
            style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
            value={value}
            onChange={(e) => handleCellValueChange(rowId, propertyId, e.target.value)}
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEditingCell(null);
            }}
          />
        ) : property.type === 'DATE' ? (
          <DatePopover value={value} onChange={(val) => handleCellValueChange(rowId, propertyId, val)} onClose={() => setEditingCell(null)} />
        ) : property.type === 'TAG' ? (
          <TagPopover
            propertyId={property.id}
            value={value}
            tagOptions={property.tagOptions}
            onChange={(val) => handleCellValueChange(rowId, property.id, val)}
            onTagOptionsUpdate={async (updatedTagOptions) => {
              if (typeof onTagOptionsUpdate === 'function') {
                onTagOptionsUpdate(property, updatedTagOptions);
              }
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
        <span className="block overflow-hidden px-2 w-full whitespace-nowrap min-h-5 text-ellipsis">{content}</span>
      )}
    </div>
  );
}

export default PropertyCell;

