import React, { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DatePopover from '../DatePopover';
import { formatKoreanDateSmart } from '@/lib/utils';
import TagPopover from '../TagPopover';
import { getColorObj } from '@/lib/colors';
import { SYSTEM_PROP_TYPES } from '@/components/documents/shared/constants';
import { GripVertical } from 'lucide-react';

function PagePropertyRow({
  property,
  value,
  isEditingHeader,
  editingHeaderName,
  setEditingHeaderName,
  onHeaderCommit,
  isEditingValue,
  editingValue,
  setEditingValue,
  onValueCommit,
  tagPopoverRect,
  setTagPopoverRect,
  setEditingValueId,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: property.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const tagCellRef = useRef(null);

  let content = null;
  const valueStr = value ?? '';

  if (isEditingValue && !SYSTEM_PROP_TYPES.includes(property.type)) {
    if (property.type === 'TEXT') {
      content = (
        <input
          autoFocus
          className="px-2 py-1 w-full rounded border outline-none"
          style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={() => {
            onValueCommit(property.id, editingValue);
            setEditingValueId(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onValueCommit(property.id, editingValue);
              setEditingValueId(null);
            }
          }}
        />
      );
    } else if (property.type === 'NUMBER') {
      content = (
        <input
          type="number"
          autoFocus
          className="px-2 py-1 w-full rounded border outline-none"
          style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={() => {
            onValueCommit(property.id, editingValue);
            setEditingValueId(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onValueCommit(property.id, editingValue);
              setEditingValueId(null);
            }
          }}
        />
      );
    } else if (property.type === 'DATE') {
      content = (
        <DatePopover
          value={editingValue}
          onChange={(val) => {
            setEditingValue(val);
            onValueCommit(property.id, val);
          }}
          onClose={() => {
            onValueCommit(property.id, editingValue);
            setEditingValueId(null);
          }}
        />
      );
    } else if (property.type === 'TAG') {
      content = null;
    }
  } else if (
    property.type === 'DATE' ||
    property.type === 'CREATED_AT' ||
    property.type === 'LAST_UPDATED_AT'
  ) {
    // 시스템/날짜 표시 시 한국어 포맷 적용
    const display = valueStr ? formatKoreanDateSmart(valueStr) : '';
    content = <span className="inline-flex items-center min-h-[28px]">{display}</span>;
  } else if (property.type === 'TAG') {
    let tags = [];
    try {
      tags = valueStr ? JSON.parse(valueStr) : [];
    } catch {}
    const tagOptions = property?.tagOptions || [];
    content = (
      <div className="flex gap-1" style={{ minWidth: 0 }}>
        {tags.map((tagId) => {
          const tagObj = tagOptions.find((opt) => opt.id === tagId);
          if (!tagObj) return null;
          const colorObj = getColorObj(tagObj.color || 'default');
          return (
            <span
              key={tagObj.id}
              className={`inline-flex items-center px-2 py-0.5 rounded text-sm ${colorObj.bg} border ${colorObj.border}`}
              style={{
                whiteSpace: 'nowrap',
                maxWidth: 360,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'inline-table',
                width: 'auto',
                minWidth: 0,
              }}
            >
              {tagObj.label}
            </span>
          );
        })}
      </div>
    );
  } else {
    // TEXT/NUMBER 등의 미수정 상태도 인풋 높이와 맞춤
    content = (
      <span className="inline-flex items-center min-h-[28px]">
        {valueStr}
      </span>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, opacity: isDragging ? 0.7 : 1, minHeight: 36 }}
      className="flex items-center min-w-[120px] py-1 px-2 rounded group relative"
    >
      {/* 좌측 핸들 바 */}
      <div
        className="absolute top-0 h-full flex items-center pl-1 pr-1 transition-opacity opacity-0 group-hover:opacity-100"
        style={{ width: 28, zIndex: 2, left: -40 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="cursor-move text-gray-400 hover:text-gray-600 py-1 rounded hover:bg-gray-100 transition duration-150"
          aria-label="drag handle"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
      </div>
      <span
        className="text-sm text-gray-500 font-medium mr-4 w-[140px] text-ellipsis"
        onClick={() => {
          if (!SYSTEM_PROP_TYPES.includes(property.type)) {
            // 편집 시작: 현재 라벨로 초기화
            setEditingHeaderName(property.name);
          }
        }}
      >
        {isEditingHeader && !SYSTEM_PROP_TYPES.includes(property.type) ? (
          <input
            autoFocus
            className="px-2 py-1 w-[140px] rounded border outline-none"
            style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
            value={editingHeaderName}
            onChange={(e) => setEditingHeaderName(e.target.value)}
            onBlur={onHeaderCommit}
            onKeyDown={(e) => e.key === 'Enter' && onHeaderCommit()}
          />
        ) : (
          property.name
        )}
      </span>
      <span
        ref={tagCellRef}
        className="relative flex-1 text-sm text-gray-900 break-all"
        onClick={() => {
          if (SYSTEM_PROP_TYPES.includes(property.type)) return;
          if (property.type === 'TAG') {
            const rect = tagCellRef.current?.getBoundingClientRect();
            if (rect) {
              setEditingValueId(property.id);
              setEditingValue(valueStr);
              setTagPopoverRect({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height,
              });
            }
          } else {
            setEditingValueId(property.id);
            setEditingValue(valueStr);
          }
        }}
        style={{
          cursor: SYSTEM_PROP_TYPES.includes(property.type) ? 'default' : 'text',
          minHeight: 32,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 4,
          padding: '2px 4px',
        }}
      >
        {content}
      </span>
    </div>
  );
}

export default PagePropertyRow;


