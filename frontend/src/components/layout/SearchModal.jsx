import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useDocument } from '@/contexts/DocumentContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';

export default function SearchModal({ open, onClose }) {
  const inputRef = useRef(null);
  const { documents, fetchDocuments, documentsLoading, selectDocument } = useDocument();
  const { currentWorkspace } = useWorkspace();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();

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

  // 최근 수정일 기준 정렬 및 30개 제한
  const recentDocuments = useMemo(() => {
    return [...documents]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 30);
  }, [documents]);

  // 검색 결과 필터링
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return recentDocuments;
    const lower = debouncedQuery.toLowerCase();
    return documents.filter(doc =>
      (doc.title && doc.title.toLowerCase().includes(lower)) ||
      (doc.content && doc.content.toLowerCase().includes(lower))
    );
  }, [debouncedQuery, documents, recentDocuments]);

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
    await selectDocument(doc);
    onClose();
    navigate(`/document/${doc.id}`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg"
        style={{ width: '40vw', height: '50vh', minWidth: 320, minHeight: 320, display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-center w-full pl-3 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="문서 제목 또는 내용을 검색하세요..."
            className="w-full px-3 py-3 rounded focus:outline-none"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="flex-1 px-2 mt-4 overflow-y-auto">
          <div className="px-2 mb-2 text-xs text-gray-400">
            {debouncedQuery.trim() ? '검색 결과' : '최근 문서'}
          </div>
          {documentsLoading ? (
            <div className="mt-8 text-center text-gray-400">문서 목록 불러오는 중...</div>
          ) : debouncedQuery.trim() && results.length === 0 ? (
            <div className="mt-8 text-center text-gray-400">검색 결과가 없습니다.</div>
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
                    {highlightText(stripHtmlTags(doc.content)?.slice(0, 60), debouncedQuery)}
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