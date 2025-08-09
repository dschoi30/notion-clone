import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getPropertyIcon } from './utils';

function SortablePropertyHeader({ property, index, onDelete, onEdit, onResize, editingHeader, setEditingHeader, colWidths }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: property.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    minWidth: colWidths[1 + index],
    width: colWidths[1 + index],
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex relative items-center text-gray-500 group"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center w-full transition-colors hover:bg-gray-50 cursor-move"
        style={{
          padding: '8px',
          borderRight: '1px solid #e9e9e7',
          borderLeft: 'none',
          background: isDragging ? '#f0f0f0' : 'transparent',
        }}
      >
        {editingHeader.id === property.id ? (
          <input
            value={editingHeader.name}
            onChange={(e) => setEditingHeader((prev) => ({ ...prev, name: e.target.value }))}
            onBlur={onEdit}
            onKeyDown={(e) => e.key === 'Enter' && onEdit()}
            autoFocus
            className="px-2 py-1 w-full rounded border outline-none"
            style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
          />
        ) : (
          <div
            className="flex items-center w-full text-gray-500"
            onClick={() => setEditingHeader({ id: property.id, name: property.name })}
          >
            {getPropertyIcon(property.type)}
            {property.name}
          </div>
        )}
        <button
          className="ml-2 text-gray-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
          style={{ fontSize: 14 }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(property.id);
          }}
          title="컬럼 삭제"
        >
          ×
        </button>
      </div>
      <div
        style={{ position: 'absolute', right: 0, top: 0, width: 6, height: '100%', cursor: 'col-resize', zIndex: 10 }}
        onMouseDown={(e) => onResize(e, 1 + index)}
      />
    </div>
  );
}

export default SortablePropertyHeader;

