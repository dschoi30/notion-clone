import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, ChevronDown, Trash2 } from 'lucide-react';
import { getPropertyIcon } from './utils';

const SortManager = ({ 
  activeSorts = [],
  onSortAdd,
  onSortUpdate,
  onSortRemove,
  properties,
  isReadOnly = false
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showAddSortDropdown, setShowAddSortDropdown] = useState(false);
  const popoverRef = useRef(null);

  // 사용 가능한 속성 목록 (이미 정렬에 사용된 속성 제외)
  const allProperties = [
    { id: 0, name: '이름', type: 'TEXT' },
    ...properties
  ];

  const availableProperties = allProperties.filter(
    property => !activeSorts.some(sort => sort.propertyId === property.id)
  );

  // ESC 키로 팝오버 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPopoverOpen) {
        setIsPopoverOpen(false);
        setShowAddSortDropdown(false);
      }
    };

    if (isPopoverOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isPopoverOpen]);

  const handleOrderChange = (sortId, newOrder) => {
    onSortUpdate(sortId, { order: newOrder });
  };

  const handlePropertyChange = (sortId, property) => {
    onSortUpdate(sortId, { 
      propertyId: property.id,
      propertyName: property.name,
      propertyType: property.type
    });
  };

  const handleRemove = (sortId) => {
    onSortRemove(sortId);
  };

  const handleAddSort = (property) => {
    console.log('Adding sort for property:', property);
    onSortAdd(property);
    setShowAddSortDropdown(false);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        className="flex gap-0.5 items-center bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-600"
        disabled={isReadOnly}
      >
        <span>정렬 {activeSorts.length}개</span>
        <ChevronDown size={12} className="text-blue-500" />
      </Button>

      {isPopoverOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[300px]">
          <div className="p-3">
            {/* 기존 정렬 목록 */}
            {activeSorts.map((sort, index) => (
              <div key={sort.id} className="flex gap-2 items-center mb-3">
                <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                  <Select 
                    value={String(sort.propertyId)} 
                      onValueChange={(value) => {
                        const property = allProperties.find(p => String(p.id) === String(value));
                        if (property) {
                          handlePropertyChange(sort.id, property);
                        }
                      }}
                  >
                    <SelectTrigger className="h-8" onClick={(e) => e.stopPropagation()}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">
                        <span className="flex gap-2 items-center">
                          {getPropertyIcon('TEXT')}
                          <span>이름</span>
                        </span>
                      </SelectItem>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={String(property.id)}>
                          <span className="flex gap-2 items-center">
                            {getPropertyIcon(property.type)}
                            <span>{property.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                  <Select 
                    value={sort.order} 
                    onValueChange={(newOrder) => {
                      if (newOrder) {
                        handleOrderChange(sort.id, newOrder);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8" onClick={(e) => e.stopPropagation()}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">오름차순</SelectItem>
                      <SelectItem value="desc">내림차순</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {!isReadOnly && (
                  <X 
                    size={16} 
                    className="flex-shrink-0 text-gray-400 cursor-pointer hover:text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(sort.id);
                    }}
                  />
                )}
              </div>
            ))}

            <div className="pt-2 border-t">
              {/* 정렬 추가 버튼 */}
              <div className="relative">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddSortDropdown(!showAddSortDropdown)}
                  className="flex gap-2 justify-start items-center w-full text-xs"
                >
                  <Plus size={12} />
                  정렬 추가
                </Button>
                
                {showAddSortDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px]">
                    <div className="p-1">
                      {availableProperties.length > 0 ? (
                        availableProperties.map((property) => (
                          <div
                            key={property.id}
                            onClick={() => handleAddSort(property)}
                            className="flex flex-row gap-2 items-center p-2 rounded-sm cursor-pointer hover:bg-gray-100"
                          >
                            <span className="flex items-center">
                              {getPropertyIcon(property.type)}
                            </span>
                            <span className="text-sm">{property.name}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-gray-400">
                          추가 가능한 정렬 속성이 없습니다
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 모든 정렬 제거 버튼 */}
              {activeSorts.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    activeSorts.forEach(sort => onSortRemove(sort.id));
                    setIsPopoverOpen(false);
                  }}
                  className="flex gap-2 justify-start items-center w-full text-xs hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 size={12} />
                  모든 정렬 제거
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SortManager;
