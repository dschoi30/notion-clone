import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical } from 'lucide-react';
import NameCell from './cells/NameCell';
import PropertyCell from './cells/PropertyCell';

function TableRow({
  row,
  rowIdx,
  properties,
  colWidths,
  editingCell,
  hoveredCell,
  setEditingCell,
  setHoveredCell,
  handleCellValueChange,
  onOpenRow,
  systemPropTypes,
  tagCellRefs,
  tagPopoverRect,
  setTagPopoverRect,
  onTagOptionsUpdate,
  // selection
  isSelected,
  onToggleSelect,
  isReadOnly = false,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id, disabled: isReadOnly });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className={`flex items-center h-10 group relative ${isSelected ? 'bg-blue-100' : ''}`} >
      {/* 좌측 레일 (NameCell 바깥) */}
      <div
        className={`absolute top-0 h-full flex items-center gap-1 pl-1 pr-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        style={{ width: 28, zIndex: 2, left: -54 }}
        onClick={(e) => e.stopPropagation()}
      >
        {!isReadOnly && (
          <>
            <button
              type="button"
              className="py-1 text-gray-400 rounded opacity-0 transition duration-150 transform -translate-x-2 cursor-grab hover:text-gray-600 group-hover:opacity-100 hover:bg-gray-100"
              aria-label="drag handle"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical size={18} />
            </button>
            <Checkbox
              checked={!!isSelected}
              onCheckedChange={() => onToggleSelect(row.id)}
              className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 data-[state=checked]:text-white"
            />
          </>
        )}
      </div>
      {/* 좌측 레일은 음수 오프셋으로 표시하므로 별도 여백을 추가하지 않음 */}
      <NameCell
        row={row}
        rowIdx={rowIdx}
        colWidth={colWidths[0]}
        editingCell={editingCell}
        hoveredCell={hoveredCell}
        setEditingCell={setEditingCell}
        setHoveredCell={setHoveredCell}
        handleCellValueChange={handleCellValueChange}
        onOpenRow={onOpenRow}
        isSelected={isSelected}
        isReadOnly={isReadOnly}
      />
      {properties.map((p, idx) => (
        <PropertyCell
          key={p.id}
          row={row}
          property={p}
          idx={idx}
          rowIdx={rowIdx}
          colWidth={colWidths[1 + idx]}
          editingCell={editingCell}
          hoveredCell={hoveredCell}
          setEditingCell={setEditingCell}
          setHoveredCell={setHoveredCell}
          handleCellValueChange={handleCellValueChange}
          systemPropTypes={systemPropTypes}
          tagCellRefs={tagCellRefs}
          tagPopoverRect={tagPopoverRect}
          setTagPopoverRect={setTagPopoverRect}
          onTagOptionsUpdate={onTagOptionsUpdate}
          isSelected={isSelected}
          isReadOnly={isReadOnly}
        />
      ))}
    </div>
  );
}

export default TableRow;

