import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown } from 'lucide-react';
import { getPropertyIcon } from './utils';

const SortDropdown = ({ properties, onSortAdd, onClearAllSorts, isReadOnly, activeSorts = [], forceShowDropdown = false }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // 문서명과 사용자 정의 속성을 함께 표시
  const allProperties = [
    { id: 0, name: '이름', type: 'TEXT' },
    ...properties
  ];

  const handlePropertySelect = (property) => {
    onSortAdd(property);
    setIsDropdownOpen(false);
  };

  const handleClearAllSorts = () => {
    onClearAllSorts();
    setIsDropdownOpen(false);
  };

  if (isReadOnly) {
    return (
      <Button 
        size="sm" 
        variant="ghost" 
        className="p-2"
        disabled
      >
        <ArrowUpDown size={16} />
      </Button>
    );
  }

  // activeSorts가 있고 forceShowDropdown이 false면 드랍다운을 표시하지 않고 정렬 제거만 수행
  if (activeSorts.length > 0 && !forceShowDropdown) {
    return (
      <Button 
        size="sm" 
        variant="ghost" 
        className="p-2"
        onClick={handleClearAllSorts}
      >
        <ArrowUpDown size={16} className="text-blue-500" />
      </Button>
    );
  }

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button 
          size="sm" 
          variant="ghost" 
          className="p-2"
        >
          <ArrowUpDown size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        onCloseAutoFocus={(e) => e.preventDefault()}
        side="bottom"
        align="start"
        className="shadow-xl"
      >
        <div className="px-2 py-1.5 text-sm font-medium text-gray-500 border-b">
          정렬 기준
        </div>
        {allProperties.length > 0 ? (
          allProperties.map((property) => (
            <DropdownMenuItem 
              key={property.id}
              onClick={() => handlePropertySelect(property)}
              className="flex flex-row gap-2 items-center cursor-pointer"
            >
              {getPropertyIcon(property.type)}
              <span>{property.name}</span>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>
            <span className="text-gray-400">추가 가능한 정렬 속성이 없습니다</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SortDropdown;
