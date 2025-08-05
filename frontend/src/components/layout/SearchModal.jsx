import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useDocument } from '@/contexts/DocumentContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import SearchFilters from './SearchFilters';
import AuthorFilterModal from './AuthorFilterModal';
import DateFilterModal, { getDateLabel } from './DateFilterModal';
import { slugify } from '@/lib/utils';

export default function SearchModal({ open, onClose }) {
  const inputRef = useRef(null);
  const { documents, fetchDocuments, documentsLoading, selectDocument } = useDocument();
  const { currentWorkspace } = useWorkspace();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();
  const [titleOnly, setTitleOnly] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [authorModalOpen, setAuthorModalOpen] = useState(false);
  const authorButtonRef = useRef(null);
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [selectedDateValue, setSelectedDateValue] = useState('');
  const dateButtonRef = useRef(null);
  const [selectedDateType, setSelectedDateType] = useState('created');

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // 바깥 클릭 시 닫기
  const modalRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  // 자동 포커스
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // 모달 열릴 때마다 문서 목록 fetch
  useEffect(() => {
    if (open && currentWorkspace) fetchDocuments();
  }, [open, currentWorkspace, fetchDocuments]);

  // 디바운스 적용
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handler);
  }, [query]);

  // 권한 있는 모든 작성자(userId, name) 추출
  const authors = useMemo(() => {
    const map = new Map();
    documents.forEach(doc => {
      if (doc.user && doc.user.userId && doc.user.name) {
        map.set(doc.user.userId, doc.user.name);
      }
      // 권한자 목록도 포함(permissions)
      if (Array.isArray(doc.permissions)) {
        doc.permissions.forEach(p => {
          if (p.userId && p.name) {
            map.set(p.userId, p.name);
          }
        });
      }
    });
    return Array.from(map, ([userId, name]) => ({ userId, name }));
  }, [documents]);

  // 검색 결과 필터링
  const results = useMemo(() => {
    let filtered = documents;
    if (selectedAuthor) {
      filtered = filtered.filter(doc =>
        (doc.user && doc.user.userId === selectedAuthor) ||
        (Array.isArray(doc.permissions) && doc.permissions.some(p => p.userId === selectedAuthor))
      );
    }
    // 날짜 필터 적용
    if (selectedDateValue) {
      filtered = filtered.filter(doc => {
        const dateField = selectedDateType === 'created' ? doc.createdAt : doc.updatedAt;
        if (!dateField) return false;
        const date = new Date(dateField);
        if (selectedDateValue === 'today') {
          const now = new Date();
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
        }
        if (selectedDateValue === 'week') {
          const now = new Date();
          const day = now.getDay();
          const start = new Date(now);
          start.setDate(now.getDate() - day);
          const end = new Date(now);
          end.setDate(now.getDate() + (6 - day));
          return date >= start && date <= end;
        }
        if (selectedDateValue === 'month') {
          const now = new Date();
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        }
        if (selectedDateValue?.type === 'custom') {
          if (selectedDateValue.range && selectedDateValue.range.start && selectedDateValue.range.end) {
            const s = selectedDateValue.range.start;
            const e = selectedDateValue.range.end;
            return date >= s && date <= e;
          }
          if (selectedDateValue.date) {
            const d = selectedDateValue.date;
            return date.getFullYear() === d.getFullYear() && date.getMonth() === d.getMonth() && date.getDate() === d.getDate();
          }
        }
        return true;
      });
    }
    if (!debouncedQuery.trim()) return filtered.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 30);
    const lower = debouncedQuery.toLowerCase();
    if (titleOnly) {
      return filtered.filter(doc =>
        doc.title && doc.title.toLowerCase().includes(lower)
      );
    }
    return filtered.filter(doc =>
      (doc.title && doc.title.toLowerCase().includes(lower)) ||
      (doc.content && doc.content.toLowerCase().includes(lower))
    );
  }, [debouncedQuery, documents, titleOnly, selectedAuthor, selectedDateValue, selectedDateType]);

  // HTML 태그 제거 함수
  function stripHtmlTags(html) {
    if (!html) return '';
    return html.replace(/<[^>]+>/g, '');
  }

  // 하이라이트 함수
  function highlightText(text, keyword) {
    if (!keyword || !text) return text;
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <b key={i} className="font-bold bg-gray-50">{part}</b> : part
    );
  }

  // 검색 결과 클릭 시 문서로 이동
  const handleResultClick = async (doc) => {
    try {
      // selectDocument 호출하지 않고 직접 navigate만 사용
      // URL 변경으로 자동으로 DocumentContext가 해당 문서를 로드할 것임
      navigate(`/${doc.id}-${slugify(doc.title || 'untitled')}`);
      onClose();
    } catch (err) {
      console.error('검색 결과 문서 이동 실패:', err);
    }
  };

  if (!open) return null;

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-30">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg"
        style={{ width: '40vw', height: '50vh', minWidth: 800, minHeight: 500, display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-center pl-3 my-2 w-full">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="문서 제목 또는 내용을 검색하세요..."
            className="py-3 pr-4 pl-2 w-full rounded focus:outline-none"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        {/* 제목만 필터 버튼 분리 */}
        <SearchFilters
          titleOnly={titleOnly}
          onToggleTitleOnly={() => setTitleOnly(v => !v)}
          onOpenAuthorModal={() => setAuthorModalOpen(true)}
          selectedAuthorName={selectedAuthor ? (authors.find(a => a.userId === selectedAuthor)?.name || '') : ''}
          authorButtonRef={authorButtonRef}
          onOpenDateModal={() => setDateModalOpen(true)}
          selectedDateLabel={getDateLabel(selectedDateValue)}
          dateButtonRef={dateButtonRef}
        />
        <AuthorFilterModal
          open={authorModalOpen}
          onClose={() => setAuthorModalOpen(false)}
          authors={authors}
          onSelectAuthor={setSelectedAuthor}
          selectedAuthor={selectedAuthor}
          anchorRef={authorButtonRef}
        />
        <DateFilterModal
          open={dateModalOpen}
          onClose={() => setDateModalOpen(false)}
          onSelect={val => setSelectedDateValue(val)}
          anchorRef={dateButtonRef}
          selected={selectedDateValue}
          dateType={selectedDateType}
          onDateTypeChange={setSelectedDateType}
        />
        <div className="overflow-y-auto flex-1 px-2 mt-4">
          <div className="px-2 mb-2 text-xs text-gray-500">
            {debouncedQuery.trim() ? '검색 결과' : '최근 문서'}
          </div>
          {documentsLoading ? (
            <div className="mt-8 text-center text-gray-500">문서 목록 불러오는 중...</div>
          ) : debouncedQuery.trim() && results.length === 0 ? (
            <div className="mt-8 text-center text-gray-500">검색 결과가 없습니다.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map(doc => (
                <li
                  key={doc.id}
                  className="px-2 py-2 rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => handleResultClick(doc)}
                >
                  <div className="font-semibold text-gray-800 truncate">
                    {highlightText(doc.title || '제목 없음', debouncedQuery)}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {highlightText(stripHtmlTags(doc.content)?.slice(0, 80), debouncedQuery)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 