import React from 'react';
import { Text } from 'lucide-react';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import SortablePropertyHeader from './SortablePropertyHeader';
import { Checkbox } from '@/components/ui/checkbox';

function TableHeader({
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
}) {
  return (
    <div className="flex items-center group relative">
      {/* 헤더 좌측 레일: 호버 시 표시 */}
      <div
        className={`absolute top-0 h-full flex items-center pl-1 pr-1 transition duration-150 ${isAllSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        style={{ width: 28, left: -32, zIndex: 2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={!!isAllSelected}
          onCheckedChange={onToggleAll}
          className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 data-[state=checked]:text-white"
        />
      </div>
      <div
        className="flex relative items-center text-gray-500"
        style={{ minWidth: colWidths[0], width: colWidths[0], padding: '8px', borderLeft: 'none', borderRight: properties.length === 0 ? 'none' : '1px solid #e9e9e7' }}
      >
        <Text className="inline mr-1" size={16} />이름
        <div style={{ position: 'absolute', right: 0, top: 0, width: 6, height: '100%', cursor: 'col-resize', zIndex: 10 }} onMouseDown={(e) => handleResizeMouseDown(e, 0)} />
      </div>
      <SortableContext items={properties.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
        {properties.map((p, idx) => (
          <SortablePropertyHeader
            key={p.id}
            property={p}
            index={idx}
            onDelete={handleDeleteProperty}
            onEdit={handleHeaderNameChange}
            onResize={handleResizeMouseDown}
            editingHeader={editingHeader}
            setEditingHeader={setEditingHeader}
            colWidths={colWidths}
          />
        ))}
      </SortableContext>
      <div className="relative">
        <button ref={addBtnRef} className="ml-2 text-sm text-gray-700 hover:bg-gray-100 px-2 py-1 rounded" onClick={() => setIsPopoverOpen((prev) => !prev)}>
          + 속성 추가
        </button>
        {isPopoverOpen && (
          <div className="absolute left-0 top-full z-10 mt-1">
            <AddPropertyPopoverComponent />
          </div>
        )}
      </div>
    </div>
  );
}

export default TableHeader;

