import React from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import PagePropertyRow from './PagePropertyRow';

function PagePropertyList({
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
}) {
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={properties.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col">
          {properties.map((prop) => (
            <PagePropertyRow
              key={prop.id}
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
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default PagePropertyList;


