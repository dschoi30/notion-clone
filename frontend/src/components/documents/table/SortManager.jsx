import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, ChevronDown, Trash2, Save } from 'lucide-react';
import { getPropertyIcon } from './utils';
import { updateChildSortOrderByCurrentSort } from '@/services/documentApi';
import { useToast } from '@/hooks/useToast';

const SortManager = ({ 
  activeSorts = [],
  onSortAdd,
  onSortUpdate,
  onSortRemove,
  properties,
  isReadOnly = false,
  isOwner = false,
  workspaceId,
  documentId,
  getSortedDocumentIds
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showAddSortDropdown, setShowAddSortDropdown] = useState(false);
  const { toast } = useToast();
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

  // 외부 클릭으로 팝오버 닫기 (더 안전한 방식)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        // 약간의 지연을 두어 내부 클릭 이벤트가 먼저 처리되도록 함
        setTimeout(() => {
          setIsPopoverOpen(false);
          setShowAddSortDropdown(false);
        }, 10);
      }
    };

    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
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
    // 생성일시나 수정일시의 경우 기본값을 내림차순으로 설정
    const defaultOrder = (property.type === 'CREATED_AT' || property.type === 'LAST_UPDATED_AT') ? 'desc' : 'asc';
    onSortAdd(property, defaultOrder);
    setShowAddSortDropdown(false);
  };

  // 팝오버 내부 클릭 시 이벤트 전파 방지
  const handlePopoverClick = (e) => {
    e.stopPropagation();
  };

  const handleSaveToAll = async () => {
    if (!isOwner || !workspaceId || !documentId || !getSortedDocumentIds) return;
    
    try {
      const sortedDocumentIds = getSortedDocumentIds();
      await updateChildSortOrderByCurrentSort(workspaceId, documentId, sortedDocumentIds);
      toast({
        title: "저장 완료",
        description: "정렬 순서가 모든 사용자에게 저장되었습니다.",
        variant: "success",
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to save sort order to all users:', error);
      toast({
        title: "저장 실패",
        description: "정렬 순서 저장에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
        duration: 3000,
      });
    }
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
        <div 
          className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50 min-w-[300px]"
          onClick={handlePopoverClick}
          onMouseDown={handlePopoverClick}
        >
          <div className="px-3 py-2">
            {/* 기존 정렬 목록 */}
            {activeSorts.map((sort, index) => (
              <div key={sort.id} className="flex gap-2 items-center mb-2">
                <div className="flex-1">
                  <Select 
                    value={String(sort.propertyId)} 
                      onValueChange={(value) => {
                        const property = allProperties.find(p => String(p.id) === String(value));
                        if (property) {
                          handlePropertyChange(sort.id, property);
                        }
                      }}
                  >
                    <SelectTrigger className="h-8">
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
                
                <div className="flex-1">
                  <Select 
                    value={sort.order} 
                    onValueChange={(newOrder) => {
                      if (newOrder) {
                        handleOrderChange(sort.id, newOrder);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8">
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

            <>
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
                  <div 
                    className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50 min-w-[200px]"
                    onClick={handlePopoverClick}
                    onMouseDown={handlePopoverClick}
                  >
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

              {/* 소유자 전용 버튼들 */}
              {isOwner && activeSorts.length > 0 && (
                <>
                  <div className="border-t"></div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveToAll}
                    className="flex gap-2 justify-start items-center w-full text-xs hover:text-orange-700 hover:bg-orange-50"
                  >
                    <Save size={12} />
                    모두에게 저장
                  </Button>
                </>
              )}
            </>
          </div>
        </div>
      )}
    </div>
  );
};

export default SortManager;
