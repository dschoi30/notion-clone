import React, { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

const SearchSlideInput = ({ isOpen, searchQuery, setSearchQuery, onClose, clearSearch, onToggle }) => {
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // 검색어가 비어있을 때만 닫기
        if (!searchQuery || searchQuery.trim() === '') onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        // 검색어가 비어있을 때만 닫기
        if (!searchQuery || searchQuery.trim() === '') onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose, searchQuery]);

  return (
    <div 
      ref={containerRef}
      className={`flex items-center h-8 overflow-hidden transition-all duration-300 ease-in-out ${
        isOpen ? 'w-56' : 'w-8'
      }`}
    >
      {/* 기존 돋보기 버튼이 인풋 좌측으로 이동 */}
      <Button 
        size="sm" 
        variant="ghost" 
        onClick={onToggle}
        className="flex-shrink-0 p-2 w-8 h-8"
        title={isOpen ? '검색 닫기' : '검색'}
      >
        <Search size={16} className="text-gray-600" />
      </Button>
      {isOpen && (
        <>
          <Input
            ref={inputRef}
            placeholder="검색어를 입력하세요."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-0 h-8 bg-transparent border-0 shadow-none focus-visible:ring-0"
          />
          {searchQuery && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={clearSearch}
              className="flex-shrink-0 p-1 w-6 h-6"
              title="입력 값 지우기"
            >
              <X size={12} />
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default SearchSlideInput;
