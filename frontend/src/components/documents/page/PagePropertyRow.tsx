import React, { useRef, forwardRef, useImperativeHandle, ChangeEvent, KeyboardEvent, MouseEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DatePopover from '../DatePopover';
import { formatKoreanDateSmart } from '@/lib/utils';
import TagPopover from '../TagPopover';
import { getColorObj } from '@/lib/colors';
import { SYSTEM_PROP_TYPES } from '@/components/documents/shared/constants';
import { GripVertical } from 'lucide-react';
import UserBadge from '@/components/documents/shared/UserBadge';
import { useDocument } from '@/contexts/DocumentContext';
import { resolveUserDisplay } from '@/components/documents/shared/resolveUserDisplay';
import type { DocumentProperty, PropertyValue } from '@/types';
import type { PagePropertyListHandle } from './PagePropertyList';

interface PagePropertyRowProps {
  property: DocumentProperty;
  value: PropertyValue | undefined;
  isEditingHeader: boolean;
  editingHeaderName: string;
  setEditingHeaderName: (name: string) => void;
  onHeaderCommit: () => void;
  isEditingValue: boolean;
  editingValue: PropertyValue;
  setEditingValue: (value: PropertyValue) => void;
  onValueCommit: (propertyId: number, value: PropertyValue) => void;
  tagPopoverRect: { top: number; left: number; width: number; height: number } | null;
  setTagPopoverRect: (rect: { top: number; left: number; width: number; height: number } | null) => void;
  setEditingValueId: (id: number | null) => void;
  isReadOnly?: boolean;
  editorRef: React.RefObject<{ focus: () => void }>;
  properties: DocumentProperty[];
  currentPropertyIndex: number;
  propertyListRef: React.RefObject<PagePropertyListHandle>;
}

export interface PagePropertyRowHandle {
  focusValue: () => void;
}

const PagePropertyRow = forwardRef<PagePropertyRowHandle, PagePropertyRowProps>(({
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
  isReadOnly = false,
  editorRef,
  properties,
  currentPropertyIndex,
  propertyListRef,
}, ref) => {
  const { currentDocument } = useDocument();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: property.id, disabled: isReadOnly });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const tagCellRef = useRef<HTMLSpanElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);

  // 외부에서 호출할 수 있는 함수들
  useImperativeHandle(ref, () => ({
    focusValue: () => {
      if (valueInputRef.current) {
        valueInputRef.current.focus();
      } else {
        // 입력 필드가 없으면 클릭으로 편집 시작
        tagCellRef.current?.click();
      }
    }
  }));

  // Tab 키로 다음 속성 또는 에디터로 포커스 이동하는 함수
  const handleTabToNext = () => {
    if (propertyListRef?.current?.focusNextProperty) {
      propertyListRef.current.focusNextProperty(currentPropertyIndex);
    }
  };

  let content: React.ReactNode = null;
  const valueStr = value ?? '';

  if (isEditingValue && !SYSTEM_PROP_TYPES.includes(property.type as any)) {
    if (property.type === 'TEXT') {
      content = (
        <input
          ref={valueInputRef}
          autoFocus
          className="px-2 py-1 w-full rounded border outline-none"
          style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
          value={editingValue as string}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingValue(e.target.value)}
          onBlur={() => {
            onValueCommit(property.id, editingValue);
            setEditingValueId(null);
          }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              onValueCommit(property.id, editingValue);
              setEditingValueId(null);
            } else if (e.key === 'Tab') {
              e.preventDefault();
              onValueCommit(property.id, editingValue);
              setEditingValueId(null);
              handleTabToNext();
            }
          }}
        />
      );
    } else if (property.type === 'NUMBER') {
      content = (
        <input
          ref={valueInputRef}
          type="number"
          autoFocus
          className="px-2 py-1 w-full rounded border outline-none"
          style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
          value={editingValue as string | number}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingValue(e.target.value)}
          onBlur={() => {
            onValueCommit(property.id, editingValue);
            setEditingValueId(null);
          }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              onValueCommit(property.id, editingValue);
              setEditingValueId(null);
            } else if (e.key === 'Tab') {
              e.preventDefault();
              onValueCommit(property.id, editingValue);
              setEditingValueId(null);
              handleTabToNext();
            }
          }}
        />
      );
    } else if (property.type === 'DATE') {
      content = (
        <DatePopover
          value={editingValue as string}
          onChange={(val: string) => {
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
      // TAG 타입은 TagPopover에서 처리
    }
  } else if (
    property.type === 'DATE' ||
    property.type === 'CREATED_AT' ||
    property.type === 'LAST_UPDATED_AT'
  ) {
    // 시스템/날짜 표시 시 한국어 포맷 적용
    const display = valueStr ? formatKoreanDateSmart(String(valueStr)) : '';
    content = <span className="inline-flex items-center min-h-[28px]">{display}</span>;
  } else if (property.type === 'CREATED_BY') {
    const { name, email, profileImageUrl } = resolveUserDisplay(String(valueStr), currentDocument?.permissions);
    content = <UserBadge name={name} email={email} profileImageUrl={profileImageUrl} />;
  } else if (property.type === 'LAST_UPDATED_BY') {
    const { name, email, profileImageUrl } = resolveUserDisplay(String(valueStr), currentDocument?.permissions);
    content = <UserBadge name={name} email={email} profileImageUrl={profileImageUrl} />;
  } else if (property.type === 'TAG') {
    let tags: number[] = [];
    try {
      tags = valueStr ? JSON.parse(String(valueStr)) : [];
      if (!Array.isArray(tags)) tags = [];
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
        {String(valueStr)}
      </span>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, opacity: isDragging ? 0.7 : 1, minHeight: 36 }}
      className="flex items-center min-w-[120px] py-1 px-2 rounded group relative"
    >
      {/* 좌측 핸들 바 (읽기 전용에서는 표시하지 않음) */}
      {!isReadOnly && (
        <div
          className="flex absolute top-0 items-center pr-1 pl-1 h-full opacity-0 transition-opacity group-hover:opacity-100"
          style={{ width: 28, zIndex: 2, left: -40 }}
          onClick={(e: MouseEvent) => e.stopPropagation()}
        >
          <button
            type="button"
            className={`py-1 text-gray-400 rounded transition duration-150 cursor-grab hover:text-gray-600 hover:bg-gray-100`}
            aria-label="drag handle"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
        </div>
      )}
      <span
        className="text-sm text-gray-500 font-medium mr-4 w-[140px] text-ellipsis"
        onClick={() => {
          if (!SYSTEM_PROP_TYPES.includes(property.type as any)) {
            // 편집 시작: 현재 라벨로 초기화
            setEditingHeaderName(property.name);
          }
        }}
      >
        {isEditingHeader && !SYSTEM_PROP_TYPES.includes(property.type as any) && !isReadOnly ? (
          <input
            autoFocus
            className="px-2 py-1 w-[140px] rounded border outline-none"
            style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
            value={editingHeaderName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingHeaderName(e.target.value)}
            onBlur={onHeaderCommit}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                onHeaderCommit();
              } else if (e.key === 'Tab') {
                e.preventDefault();
                onHeaderCommit();
                handleTabToNext();
              }
            }}
          />
        ) : (
          property.name
        )}
      </span>
      <span
        ref={tagCellRef}
        className="relative flex-1 text-sm text-gray-900 break-all"
        onClick={() => {
          if (SYSTEM_PROP_TYPES.includes(property.type as any)) return;
          if (isReadOnly) return;
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
          cursor: SYSTEM_PROP_TYPES.includes(property.type as any) ? 'default' : 'text',
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
});

PagePropertyRow.displayName = 'PagePropertyRow';

export default PagePropertyRow;

