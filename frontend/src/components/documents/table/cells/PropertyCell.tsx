import React, { createRef, useEffect, useRef, memo, Dispatch, SetStateAction, KeyboardEvent } from 'react';
import DatePopover from '../../DatePopover';
import TagPopover from '../../TagPopover';
import { formatKoreanDateSmart } from '@/lib/utils';
import UserBadge from '@/components/documents/shared/UserBadge';
import { resolveUserDisplay } from '@/components/documents/shared/resolveUserDisplay';
import { useDocument } from '@/contexts/DocumentContext';
import { getColorObj } from '@/lib/colors';
import type { DocumentProperty } from '@/types';
import type { TableRowData } from '@/components/documents/shared/constants';

interface EditingCell {
  rowId: number;
  propertyId: number | null;
}

interface HoveredCell {
  rowId: number;
  propertyId: number | null;
}

interface SelectedCell {
  rowId: number;
  propertyId: number | null;
}

interface TagPopoverRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PropertyCellProps {
  row: TableRowData;
  property: DocumentProperty;
  idx: number;
  rowIdx: number;
  colWidth: number;
  editingCell: EditingCell | null;
  hoveredCell: HoveredCell | null;
  setEditingCell: Dispatch<SetStateAction<EditingCell | null>>;
  setHoveredCell: Dispatch<SetStateAction<HoveredCell | null>>;
  handleCellValueChange: (rowId: number, propertyId: number | null, value: any) => void;
  systemPropTypes: readonly string[];
  tagCellRefs: React.MutableRefObject<Record<string, { current: HTMLDivElement | null }>>;
  tagPopoverRect: TagPopoverRect | null;
  setTagPopoverRect: Dispatch<SetStateAction<TagPopoverRect | null>>;
  onTagOptionsUpdate: (property: DocumentProperty, updatedTagOptions: any[]) => void;
  isSelected: boolean;
  isReadOnly?: boolean;
  selectedCell: SelectedCell | null;
  onCellClick: (rowId: number, propertyId: number | null) => void;
  onCellKeyDown: (e: KeyboardEvent<HTMLElement>, rowId: number, propertyId: number | null) => void;
}

const PropertyCell: React.FC<PropertyCellProps> = memo(function PropertyCell({
  row,
  property,
  rowIdx,
  colWidth,
  editingCell,
  setEditingCell,
  setHoveredCell,
  handleCellValueChange,
  systemPropTypes,
  tagCellRefs,
  tagPopoverRect,
  setTagPopoverRect,
  onTagOptionsUpdate,
  isSelected,
  isReadOnly = false,
  selectedCell,
  onCellClick,
  onCellKeyDown,
}) {
  const { currentDocument } = useDocument();
  const cellRef = useRef<HTMLDivElement>(null);
  
  // 셀이 선택되면 자동으로 포커스 설정
  useEffect(() => {
    if (!property || !property.id) return;
    
    const rowId = row.id;
    const propertyId = property.id;
    const isEditing = editingCell && editingCell.rowId === rowId && editingCell.propertyId === propertyId;
    const isCellSelected = selectedCell && selectedCell.rowId === rowId && selectedCell.propertyId === propertyId;
    
    if (isCellSelected && cellRef.current && !isEditing) {
      cellRef.current.focus();
    }
  }, [property, row, editingCell, selectedCell]);
  
  // property가 null이거나 id가 없는 경우 렌더링하지 않음
  if (!property || !property.id) {
    return null;
  }
  const rowId = row.id;
  const propertyId = property.id;
  const isEditing = editingCell && editingCell.rowId === rowId && editingCell.propertyId === propertyId;
  const isCellSelected = selectedCell && selectedCell.rowId === rowId && selectedCell.propertyId === propertyId;
  const isSystemProp = systemPropTypes.includes(property.type);
  const value = property ? row.values[property.id] || '' : '';
  let content: string | React.ReactNode = value;

  // 시스템 속성은 row.document 메타데이터를 우선 사용(표시 일관성)
  if (property.type === 'CREATED_AT') {
    const v = row?.document?.createdAt || value;
    content = formatKoreanDateSmart(v as string);
  } else if (property.type === 'LAST_UPDATED_AT') {
    const v = row?.document?.updatedAt || value;
    content = formatKoreanDateSmart(v as string);
  } else if (property.type === 'CREATED_BY') {
    const raw = row?.document?.createdBy || value || '';
    const combinedPerms = [
      ...((row?.document?.permissions || [])),
      ...((currentDocument?.permissions || [])),
    ];
    const { name, email, profileImageUrl } = resolveUserDisplay(raw as string, combinedPerms);
    content = (<UserBadge name={name} email={email} profileImageUrl={profileImageUrl} />);
  } else if (property.type === 'LAST_UPDATED_BY') {
    const raw = row?.document?.updatedBy || value || '';
    const combinedPerms = [
      ...((row?.document?.permissions || [])),
      ...((currentDocument?.permissions || [])),
    ];
    const { name, email, profileImageUrl } = resolveUserDisplay(raw as string, combinedPerms);
    content = (<UserBadge name={name} email={email} profileImageUrl={profileImageUrl} />);
  } else if (property.type === 'DATE') {
    content = formatKoreanDateSmart(value as string);
  }

  if (property.type === 'TAG') {
    let tags: number[] = [];
    try {
      tags = value ? (typeof value === 'string' ? JSON.parse(value) : Array.isArray(value) ? value : []) : [];
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
              // getBoundingClientRect()는 뷰포트 기준 좌표를 반환하므로
              // position: fixed를 사용하는 팝오버에 그대로 사용 가능
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
  if (!tagCellRefs.current[cellKey]) tagCellRefs.current[cellKey] = createRef<HTMLDivElement>();

  return (
    <div
      key={property.id}
      data-cell-id={`${rowId}_${propertyId}`}
      ref={(el) => {
        tagCellRefs.current[cellKey] = { current: el };
        cellRef.current = el;
      }}
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
        cursor: isReadOnly ? 'default' : isEditing ? (isSystemProp ? 'default' : 'text') : isSystemProp ? 'default' : 'pointer',
        outline: 'none',
      }}
      onClick={() => {
        if (!isSystemProp && !isReadOnly) {
          onCellClick(rowId, propertyId);
        }
      }}
      onMouseEnter={() => { if (!isReadOnly) setHoveredCell({ rowId, propertyId }); }}
      onMouseLeave={() => { if (!isReadOnly) setHoveredCell(null); }}
      onKeyDown={(e) => {
        if (!isReadOnly) {
          onCellKeyDown(e, rowId, propertyId);
        }
      }}
      tabIndex={isCellSelected ? 0 : -1}
    >
      {isEditing && !isSystemProp && !isReadOnly ? (
        property.type === 'TEXT' ? (
          <input
            autoFocus
            className="px-2 w-full h-full outline-none"
            value={value as string}
            onChange={(e) => handleCellValueChange(rowId, propertyId, e.target.value)}
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
        ) : property.type === 'NUMBER' ? (
          <input
            type="number"
            autoFocus
            className="px-2 py-1 w-full h-full outline-none"
            value={value as number}
            onChange={(e) => handleCellValueChange(rowId, propertyId, e.target.value)}
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
        ) : property.type === 'DATE' ? (
          <DatePopover value={value as string} onChange={(val) => handleCellValueChange(rowId, propertyId, val)} onClose={() => setEditingCell(null)} />
        ) : property.type === 'TAG' ? (
          <TagPopover
            propertyId={property.id}
            value={value as string}
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
});

export default PropertyCell;

