import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown } from 'lucide-react';
import { getPropertyIcon } from './utils';
import { Z_INDEX } from '@/constants/zIndex';

const SortDropdown = ({ properties, onSortAdd, onClearAllSorts, isReadOnly, activeSorts = [], forceShowDropdown = false, autoAddNameProperty = true, menuAlign = 'start' }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const menuRef = useRef(null);
  // 문서명과 사용자 정의 속성을 함께 표시
  // autoAddNameProperty가 true이고 properties에 id: 0인 속성이 없으면 "이름" 속성 추가 (문서 테이블용)
  const hasNameProperty = properties.some(p => p.id === 0 || p.id === '0');
  const allProperties = (autoAddNameProperty && !hasNameProperty)
    ? [{ id: 0, name: '이름', type: 'TEXT' }, ...properties]
    : properties;

  const handlePropertySelect = (property) => {
    // 생성일시나 수정일시의 경우 기본값을 내림차순으로 설정
    const defaultOrder = (property.type === 'CREATED_AT' || property.type === 'LAST_UPDATED_AT') ? 'desc' : 'asc';
    onSortAdd(property, defaultOrder);
    setIsDropdownOpen(false);
  };

  const handleClearAllSorts = () => {
    onClearAllSorts();
    setIsDropdownOpen(false);
  };

  // 메뉴를 화면 좌측에 고정
  useEffect(() => {
    if (isDropdownOpen && menuAlign === 'start') {
      const updatePosition = () => {
        // Portal로 렌더링된 메뉴 요소 찾기
        const menuElement = document.querySelector('[data-radix-popper-content-wrapper]');
        if (menuElement) {
          const rect = menuElement.getBoundingClientRect();
          if (rect.left > 0) {
            menuElement.style.left = '0px';
            menuElement.style.right = 'auto';
            menuElement.style.transform = 'none';
            menuElement.style.width = 'auto';
          }
        }
      };
      
      // 약간의 지연 후 위치 조정 (Radix UI가 포지셔닝을 완료한 후)
      const timeoutId = setTimeout(updatePosition, 10);
      const intervalId = setInterval(updatePosition, 10);
      
      return () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
      };
    }
  }, [isDropdownOpen, menuAlign]);

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
        ref={menuRef}
        onCloseAutoFocus={(e) => e.preventDefault()}
        side="bottom"
        align={menuAlign === 'start' ? 'end' : menuAlign}
        alignOffset={menuAlign === 'start' ? -1000 : undefined}
        className={`shadow-xl !z-[1120] ${menuAlign === 'start' ? '[&[data-radix-popper-content-wrapper]]:!left-0 [&[data-radix-popper-content-wrapper]]:!right-auto [&[data-radix-popper-content-wrapper]]:!transform-none' : ''}`}
        style={{ zIndex: Z_INDEX.SETTINGS_PANEL + 10 }}
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
