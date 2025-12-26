import { useState, useEffect, useRef } from 'react';
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
import type { DocumentProperty } from '@/types';

interface SortConfig {
  id: string;
  propertyId: number;
  propertyName: string;
  propertyType: string;
  order: 'asc' | 'desc';
}

interface SortDropdownProps {
  properties: DocumentProperty[];
  onSortAdd: (property: DocumentProperty | { id: number; name: string; type: string }, defaultOrder?: 'asc' | 'desc') => void;
  onClearAllSorts: () => void;
  isReadOnly?: boolean;
  activeSorts?: SortConfig[];
  forceShowDropdown?: boolean;
  autoAddNameProperty?: boolean;
  menuAlign?: 'start' | 'end';
}

const SortDropdown = ({ 
  properties, 
  onSortAdd, 
  onClearAllSorts, 
  isReadOnly = false, 
  activeSorts = [], 
  forceShowDropdown = false, 
  autoAddNameProperty = true, 
  menuAlign = 'start' 
}: SortDropdownProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // 문서명과 사용자 정의 속성을 함께 표시
  // autoAddNameProperty가 true이고 properties에 id: 0인 속성이 없으면 "이름" 속성 추가 (문서 테이블용)
  const hasNameProperty = properties.some(p => p.id === 0 || p.id === '0');
  const allProperties: Array<DocumentProperty | { id: number; name: string; type: string }> = (autoAddNameProperty && !hasNameProperty)
    ? [{ id: 0, name: '이름', type: 'TEXT' } as DocumentProperty, ...properties]
    : properties;

  const handlePropertySelect = (property: DocumentProperty | { id: number; name: string; type: string }) => {
    // 생성일시나 수정일시의 경우 기본값을 내림차순으로 설정
    const defaultOrder = (property.type === 'CREATED_AT' || property.type === 'LAST_UPDATED_AT') ? 'desc' : 'asc';
    onSortAdd(property, defaultOrder);
    setIsDropdownOpen(false);
  };

  const handleClearAllSorts = () => {
    onClearAllSorts();
    setIsDropdownOpen(false);
  };

  // 메뉴를 트리거 바로 아래에 고정
  useEffect(() => {
    if (!isDropdownOpen || !triggerRef.current) return;

    const menuElement = document.querySelector('[data-radix-popper-content-wrapper]') as HTMLElement;
    if (!menuElement) return;

    const updatePosition = () => {
      if (!triggerRef.current || !menuElement) return;
      const triggerRect = triggerRef.current.getBoundingClientRect();

      menuElement.style.left = `${triggerRect.left}px`;
      menuElement.style.top = `${triggerRect.bottom + window.scrollY}px`;
      menuElement.style.transform = 'none';
    };

    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, { passive: true });

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isDropdownOpen]);

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

  // activeSorts가 있으면 파란색 배경으로 표시
  const hasActiveSorts = activeSorts.length > 0;
  const buttonClassName = hasActiveSorts 
    ? "p-2 bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-600"
    : "p-2";

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button 
          ref={triggerRef}
          size="sm" 
          variant={hasActiveSorts ? "outline" : "ghost"}
          className={buttonClassName}
        >
          <ArrowUpDown size={16} className={hasActiveSorts ? "text-blue-500" : ""} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
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

