import React, { cloneElement, ReactElement } from 'react';
import { Text, Hash, Calendar, Tag, User, Clock, Edit3 } from 'lucide-react';
import type { PropertyType } from '@/types';

interface PropertyTypeOption {
  value: PropertyType | 'CREATED_BY' | 'LAST_UPDATED_BY' | 'CREATED_AT' | 'LAST_UPDATED_AT';
  label: string;
  icon: ReactElement;
}

const userPropTypes: PropertyTypeOption[] = [
    { value: 'TEXT', label: '텍스트', icon: <Text size={16} /> },
    { value: 'NUMBER', label: '숫자', icon: <Hash size={16} /> },
    { value: 'DATE', label: '날짜', icon: <Calendar size={16} /> },
    { value: 'TAG', label: '태그', icon: <Tag size={16} /> },
];

const systemPropTypes: PropertyTypeOption[] = [
    { value: 'CREATED_BY', label: '생성자', icon: <User size={16} /> },
    { value: 'LAST_UPDATED_BY', label: '최종 편집자', icon: <Edit3 size={16} /> },
    { value: 'CREATED_AT', label: '생성 일시', icon: <Clock size={16} /> },
    { value: 'LAST_UPDATED_AT', label: '최종 편집 일시', icon: <Clock size={16} /> },
];

interface PropertyTypeGridProps {
  onSelect: (prop: PropertyTypeOption) => void;
}

function PropertyTypeGrid({ onSelect }: PropertyTypeGridProps) {
  return (
    <div className="overflow-y-auto max-h-60">
      <div className="grid grid-cols-2 gap-1">
        {userPropTypes.map(prop => (
          <button
            key={prop.value}
            onClick={() => onSelect(prop)}
            className="flex items-center p-2 w-full text-sm rounded hover:bg-gray-100"
          >
            {cloneElement(prop.icon, { className: 'mr-2' })}
            <span>{prop.label}</span>
          </button>
        ))}
      </div>
      <hr className="my-2" />
        {systemPropTypes.map(prop => (
          <button
            key={prop.value}
            onClick={() => onSelect(prop)}
            className="flex items-center p-2 w-full text-sm rounded hover:bg-gray-100"
          >
            {cloneElement(prop.icon, { className: 'mr-2' })}
            <span>{prop.label}</span>
          </button>
        ))}
    </div>
  )
}

interface AddPropertyPopoverProps {
  onAddProperty: (label: string, value: string) => void;
}

export default function AddPropertyPopover({ onAddProperty }: AddPropertyPopoverProps) {
  const handleSelect = (prop: PropertyTypeOption) => {
    onAddProperty(prop.label, prop.value);
  };

  return (
    <div className="p-2 bg-white border rounded shadow-lg w-[300px] z-50">
      <PropertyTypeGrid onSelect={handleSelect} />
    </div>
  );
}

