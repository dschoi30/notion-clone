import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { DndContext, closestCenter, SensorDescriptor, SensorOptions } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import PagePropertyRow from './PagePropertyRow';
import type { DocumentProperty } from '@/types';

interface PagePropertyListProps {
  properties: DocumentProperty[];
  valuesByPropertyId: Record<number, string | number | boolean | number[]>;
  sensors: SensorDescriptor<SensorOptions>[];
  onDragEnd: (event: any) => void;
  editingHeader: { id: number | null; name: string };
  setEditingHeader: (header: { id: number | null; name: string }) => void;
  onHeaderCommit: () => void;
  editingValueId: number | null;
  setEditingValueId: (id: number | null) => void;
  editingValue: string | number | boolean | number[];
  setEditingValue: (value: string | number | boolean | number[]) => void;
  onValueCommit: (propertyId: number, value: string | number | boolean | number[]) => void;
  tagPopoverRect: { top: number; left: number; width: number; height: number } | null;
  setTagPopoverRect: (rect: { top: number; left: number; width: number; height: number } | null) => void;
  isReadOnly?: boolean;
  editorRef: React.RefObject<{ focus: () => void }>;
}

export interface PagePropertyListHandle {
  focusFirstProperty: () => void;
  focusNextProperty: (currentIndex: number) => void;
}

const PagePropertyList = forwardRef<PagePropertyListHandle, PagePropertyListProps>(({
  properties,
  valuesByPropertyId,
  sensors,
  onDragEnd,
  editingHeader,
  setEditingHeader,
  onHeaderCommit,
  editingValueId,
  setEditingValueId,
  editingValue,
  setEditingValue,
  onValueCommit,
  tagPopoverRect,
  setTagPopoverRect,
  isReadOnly = false,
  editorRef,
}, ref) => {
  const propertyRowRefs = useRef<Record<number, { focusValue: () => void }>>({});

  // 외부에서 호출할 수 있는 함수들
  useImperativeHandle(ref, () => ({
    focusFirstProperty: () => {
      const firstProperty = properties[0];
      if (firstProperty && propertyRowRefs.current[firstProperty.id]) {
        propertyRowRefs.current[firstProperty.id].focusValue();
      }
    },
    focusNextProperty: (currentIndex: number) => {
      const nextIndex = currentIndex + 1;
      if (nextIndex < properties.length) {
        const nextProperty = properties[nextIndex];
        if (propertyRowRefs.current[nextProperty.id]) {
          propertyRowRefs.current[nextProperty.id].focusValue();
        }
      } else {
        // 마지막 속성이면 에디터로 이동
        if (editorRef?.current?.focus) {
          editorRef.current.focus();
        }
      }
    }
  }));
  
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={properties.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col">
          {properties.map((prop) => (
            <PagePropertyRow
              key={prop.id}
              ref={(el) => {
                if (el) {
                  propertyRowRefs.current[prop.id] = el;
                } else {
                  delete propertyRowRefs.current[prop.id];
                }
              }}
              property={prop}
              value={valuesByPropertyId[prop.id]}
              isEditingHeader={editingHeader.id === prop.id}
              editingHeaderName={editingHeader.name}
              setEditingHeaderName={(name) => setEditingHeader({ id: prop.id, name })}
              onHeaderCommit={onHeaderCommit}
              isEditingValue={editingValueId === prop.id}
              editingValue={editingValue}
              setEditingValue={setEditingValue}
              onValueCommit={onValueCommit}
              tagPopoverRect={tagPopoverRect}
              setTagPopoverRect={setTagPopoverRect}
              setEditingValueId={setEditingValueId}
              isReadOnly={isReadOnly}
              editorRef={editorRef}
              properties={properties}
              currentPropertyIndex={properties.findIndex(p => p.id === prop.id)}
              propertyListRef={ref}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
});

PagePropertyList.displayName = 'PagePropertyList';

export default PagePropertyList;

