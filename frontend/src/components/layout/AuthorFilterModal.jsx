import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import UserBadge from '@/components/documents/shared/UserBadge';

export default function AuthorFilterModal({ open, onClose, authors = [], onSelectAuthor, selectedAuthor, anchorRef }) {
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, minWidth: 180 });
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // 위치 계산
  useLayoutEffect(() => {
    if (!open || !anchorRef?.current || !modalRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      minWidth: rect.width || 180,
    });
  }, [open, anchorRef]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (
        modalRef.current && !modalRef.current.contains(e.target) &&
        anchorRef?.current && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose, anchorRef]);

  // 자동 포커스
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
    if (!open) setSearch('');
  }, [open]);

  // 검색어로 필터링
  const filteredAuthors = useMemo(() => {
    if (!search.trim()) return authors;
    const lower = search.toLowerCase();
    return authors.filter(a => a.name.toLowerCase().includes(lower));
  }, [search, authors]);

  if (!open) return null;

  return (
    <div
      ref={modalRef}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        minWidth: position.minWidth,
        zIndex: 1000,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}
      className="p-4 bg-white border border-gray-200 rounded-lg"
    >
      <div className="mb-2">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="작성자 이름 검색"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none"
        />
      </div>
      <ul className="overflow-y-auto divide-y divide-gray-100 max-h-60">
        <li
          className={`py-2 px-2 cursor-pointer rounded ${!selectedAuthor ? 'bg-gray-100' : 'hover:bg-gray-200'}`}
          onClick={() => { onSelectAuthor(''); onClose(); }}
        >
          전체
        </li>
        {filteredAuthors.map(author => (
          <li
            key={author.userId}
            className={`py-2 px-2 cursor-pointer rounded flex items-center gap-2 ${selectedAuthor === author.userId ? 'bg-gray-100' : 'hover:bg-gray-200'}`}
            onClick={() => { onSelectAuthor(author.userId); onClose(); }}
          >
            <UserBadge name={author.name} email={author.email} profileImageUrl={author.profileImageUrl} size={32} showLabel={false} />
            <span>{author.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
} 