import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter } from 'lucide-react';
import { SYSTEM_PROP_TYPES } from '@/components/documents/shared/constants';

const FilterDropdown = ({ properties, onFilterAdd, isReadOnly }) => {
  // 시스템 속성과 사용자 정의 속성을 함께 표시
  const allProperties = [
    { id: 'title', name: '제목', type: 'text' },
    { id: 'createdAt', name: '생성일', type: 'date' },
    { id: 'updatedAt', name: '수정일', type: 'date' },
    ...properties
  ];

  const handlePropertySelect = (property) => {
    onFilterAdd(property);
  };

  if (isReadOnly) {
    return (
      <Button 
        size="sm" 
        variant="ghost" 
        className="p-2"
        disabled
      >
        <Filter size={16} />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          size="sm" 
          variant="ghost" 
          className="p-2"
        >
          <Filter size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {allProperties.map((property) => (
          <DropdownMenuItem 
            key={property.id}
            onClick={() => handlePropertySelect(property)}
            className="flex gap-2 items-center"
          >
            <span>{property.name}</span>
            <span className="text-xs text-gray-400">({property.type})</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FilterDropdown;
