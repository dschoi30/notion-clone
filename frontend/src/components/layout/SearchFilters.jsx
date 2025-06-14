import React from 'react';
import { Book, User, Calendar, ChevronDown } from 'lucide-react';

export default function SearchFilters({ titleOnly, onToggleTitleOnly, onOpenAuthorModal, selectedAuthorName, authorButtonRef, onOpenDateModal, selectedDateLabel, dateButtonRef }) {
  return (
    <div className="flex gap-2 pl-3 mb-2">
      <button
        className={`pl-1 pr-3 py-1 rounded flex items-center gap-1 ${titleOnly ? 'bg-blue-50 text-blue-700 ' : 'text-gray-500'}`}
        onClick={onToggleTitleOnly}
      >
        <Book className="w-4 h-4" />
        제목만
      </button>
      <button
        ref={authorButtonRef}
        className={`flex items-center gap-1 px-3 py-1 rounded ${selectedAuthorName ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}
        onClick={onOpenAuthorModal}
        type="button"
      >
        <User className="w-4 h-4" />
        작성자
        {selectedAuthorName && (
          <span className="text-blue-700">: {selectedAuthorName}</span>
        )}
        <ChevronDown className="w-4 h-4" />
      </button>
      <button
        ref={dateButtonRef}
        className={`flex items-center gap-1 px-3 py-1 rounded ${selectedDateLabel ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}
        onClick={onOpenDateModal}
        type="button"
      >
        <Calendar className="w-4 h-4" />
        날짜
        {selectedDateLabel && (
          <span className="text-blue-700 ">: {selectedDateLabel}</span>
        )}
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
} 