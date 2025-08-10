import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center h-10 group relative">
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
        dragAttributes={attributes}
        dragListeners={listeners}
        isRowDragging={isDragging}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
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
        />
      ))}
    </div>
  );
}

export default TableRow;

