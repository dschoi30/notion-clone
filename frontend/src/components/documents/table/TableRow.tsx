import React, { memo, Dispatch, SetStateAction, KeyboardEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical } from 'lucide-react';
import NameCell from './cells/NameCell';
import PropertyCell from './cells/PropertyCell';
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

interface TableRowProps {
  row: TableRowData;
  rowIdx: number;
  properties: DocumentProperty[];
  colWidths: any[];
  editingCell: EditingCell | null;
  hoveredCell: HoveredCell | null;
  setEditingCell: Dispatch<SetStateAction<EditingCell | null>>;
  setHoveredCell: Dispatch<SetStateAction<HoveredCell | null>>;
  handleCellValueChange: (rowId: number, propertyId: number | null, value: any) => void;
  onOpenRow: (row: TableRowData) => void;
  systemPropTypes: readonly string[];
  tagCellRefs: React.MutableRefObject<Record<string, { current: HTMLDivElement | null }>>;
  tagPopoverRect: TagPopoverRect | null;
  setTagPopoverRect: Dispatch<SetStateAction<TagPopoverRect | null>>;
  onTagOptionsUpdate: (property: DocumentProperty, updatedTagOptions: any[]) => void;
  isSelected: boolean;
  onToggleSelect: (rowId: number) => void;
  isReadOnly?: boolean;
  selectedCell: SelectedCell | null;
  onCellClick: (rowId: number, propertyId: number | null) => void;
  onCellKeyDown: (e: KeyboardEvent<HTMLElement>, rowId: number, propertyId: number | null) => void;
}

const TableRow: React.FC<TableRowProps> = memo(function TableRow({
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
  isSelected,
  onToggleSelect,
  isReadOnly = false,
  selectedCell,
  onCellClick,
  onCellKeyDown,
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
        selectedCell={selectedCell}
        onCellClick={onCellClick}
        onCellKeyDown={onCellKeyDown}
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
          selectedCell={selectedCell}
          onCellClick={onCellClick}
          onCellKeyDown={onCellKeyDown}
        />
      ))}
    </div>
  );
});

export default TableRow;

