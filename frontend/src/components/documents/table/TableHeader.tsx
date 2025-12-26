import React, { useEffect, useRef, memo, Dispatch, SetStateAction } from 'react';
import { Text } from 'lucide-react';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import SortablePropertyHeader from './SortablePropertyHeader';
import { Checkbox } from '@/components/ui/checkbox';
import { Z_INDEX } from '@/constants/zIndex';
import type { DocumentProperty } from '@/types';

interface EditingHeader {
  id: any;
  name: string;
}

interface TableHeaderProps {
  colWidths: any[];
  properties: DocumentProperty[];
  handleResizeMouseDown: (e: React.MouseEvent, colIdx: number) => void;
  editingHeader: EditingHeader;
  setEditingHeader: Dispatch<SetStateAction<EditingHeader>>;
  handleDeleteProperty: (propertyId: number) => void;
  handleHeaderNameChange: (propertyId: number, newName: string) => void;
  addBtnRef: React.RefObject<HTMLButtonElement>;
  isPopoverOpen: boolean;
  setIsPopoverOpen: Dispatch<SetStateAction<boolean>>;
  AddPropertyPopoverComponent: () => React.ReactNode;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  onToggleAll: () => void;
  isReadOnly?: boolean;
}

const TableHeader: React.FC<TableHeaderProps> = memo(function TableHeader({
  colWidths,
  properties,
  handleResizeMouseDown,
  editingHeader,
  setEditingHeader,
  handleDeleteProperty,
  handleHeaderNameChange,
  addBtnRef,
  isPopoverOpen,
  setIsPopoverOpen,
  AddPropertyPopoverComponent,
  isAllSelected,
  isSomeSelected,
  onToggleAll,
  isReadOnly = false,
}) {
  // properties를 안전하게 필터링
  const safeProperties = properties?.filter(p => p && p.id) || [];
  
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const popoverEl = popoverRef.current;
      const buttonEl = addBtnRef?.current;

      const target = event.target as Node;
      const clickedInsidePopover = popoverEl && popoverEl.contains(target);
      const clickedOnButton = buttonEl && buttonEl.contains(target);

      if (!clickedInsidePopover && !clickedOnButton) {
        setIsPopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown, true);
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
    };
  }, [isPopoverOpen, setIsPopoverOpen, addBtnRef]);

  return (
    <div 
      className="flex sticky top-12 items-center bg-white group"
      style={{ zIndex: Z_INDEX.TABLE_HEADER }}
    >
      {/* 헤더 좌측 레일: 읽기 전용이 아닐 때만 표시 */}
      {!isReadOnly && (
        <div
          className={`absolute top-0 h-full flex items-center pl-1 pr-1 transition duration-150 bg-white ${isAllSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          style={{ width: 28, left: -32, zIndex: 2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={!!isAllSelected}
            onCheckedChange={onToggleAll}
            className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 data-[state=checked]:text-white"
          />
        </div>
      )}
      <div
        className="flex relative items-center text-gray-500"
        style={{ minWidth: colWidths[0], width: colWidths[0], padding: '8px', borderLeft: 'none', borderRight: safeProperties.length === 0 ? 'none' : '1px solid #e9e9e7' }}
      >
        <Text className="inline mr-1" size={16} />이름
        <div style={{ position: 'absolute', right: 0, top: 0, width: 6, height: '100%', cursor: 'col-resize', zIndex: 10 }} onMouseDown={(e) => handleResizeMouseDown(e, 0)} />
      </div>
      <SortableContext items={safeProperties.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
        {safeProperties.map((p, idx) => (
          <SortablePropertyHeader
            key={p.id}
            property={p}
            index={idx}
            onDelete={handleDeleteProperty}
            onEdit={() => {
              if (editingHeader.id !== null) {
                handleHeaderNameChange(editingHeader.id, editingHeader.name);
              }
            }}
            onResize={handleResizeMouseDown}
            editingHeader={editingHeader}
            setEditingHeader={setEditingHeader}
            colWidths={colWidths}
            isReadOnly={isReadOnly}
          />
        ))}
      </SortableContext>
      {!isReadOnly && (
        <div className="relative">
          <button ref={addBtnRef} className="px-2 py-1 ml-2 text-sm text-gray-700 rounded hover:bg-gray-100" onClick={() => setIsPopoverOpen((prev) => !prev)}>
            + 속성 추가
          </button>
          {isPopoverOpen && (
            <div ref={popoverRef} className="absolute left-0 top-full z-10 mt-1">
              <AddPropertyPopoverComponent />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default TableHeader;

