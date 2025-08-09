import React from 'react';
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
}) {
  return (
    <div className="flex items-center h-10">
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

