import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { getDocumentVersions, getDocumentVersion, restoreDocumentVersion, getProperties } from '@/services/documentApi';
import { createLogger } from '@/lib/logger';
import { useDocument } from '@/contexts/DocumentContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatKoreanDateSmart } from '@/lib/utils';
import { getColorObj } from '@/lib/colors';
import UserBadge from '@/components/documents/shared/UserBadge';
import { resolveUserDisplay } from '@/components/documents/shared/resolveUserDisplay';
import { Z_INDEX } from '@/constants/zIndex';

function VersionProperties({ propertiesJson, valuesJson, tagOptionsByPropId }) {
  const props = useMemo(() => {
    try { return propertiesJson ? JSON.parse(propertiesJson) : []; } catch { return []; }
  }, [propertiesJson]);
  const values = useMemo(() => {
    try { return valuesJson ? JSON.parse(valuesJson) : {}; } catch { return {}; }
  }, [valuesJson]);
  if (!props || props.length === 0) return null;
  return (
    <div className="mt-6 space-y-2">
      {props.map((p) => {
        const rawValue = values[String(p.id)] ?? '';
        let renderedValue = null;
        if (p.type === 'DATE' || p.type === 'CREATED_AT' || p.type === 'LAST_UPDATED_AT') {
          renderedValue = (
            <span className="inline-flex items-center min-h-[28px]">
              {rawValue ? formatKoreanDateSmart(rawValue) : ''}
            </span>
          );
        } else if (p.type === 'TAG') {
          let tagIds = [];
          try { tagIds = rawValue ? JSON.parse(rawValue) : []; } catch {}
          const tagOptions = tagOptionsByPropId?.[p.id] || [];
          renderedValue = (
            <div className="flex gap-1" style={{ minWidth: 0 }}>
              {Array.isArray(tagIds) && tagIds.map((tid) => {
                const tagObj = tagOptions.find((opt) => String(opt.id) === String(tid));
                if (!tagObj) return null;
                const colorObj = getColorObj(tagObj.color || 'default');
                return (
                  <span
                    key={tid}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-sm ${colorObj.bg} border ${colorObj.border}`}
                    style={{ whiteSpace: 'nowrap', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-table', width: 'auto', minWidth: 0 }}
                  >
                    {tagObj.label}
                  </span>
                );
              })}
            </div>
          );
        } else {
          renderedValue = (
            <span className="inline-flex items-center min-h-[28px]">
              {rawValue}
            </span>
          );
        }
        return (
          <div key={p.id || p.name} className="grid grid-cols-2 gap-3 items-start">
            <div className="text-sm text-gray-500">{p.name}</div>
            <div className="text-sm break-words">{renderedValue}</div>
          </div>
        );
      })}
    </div>
  );
}

function VersionHistoryPanel({ workspaceId, documentId, onClose }) {
  const [versions, setVersions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [tagOptionsByPropId, setTagOptionsByPropId] = useState({});
  const log = createLogger('version');
  const { fetchDocument, currentDocument, fetchDocuments, refreshAllChildDocuments } = useDocument();
  const { user } = useAuth();

  // 권한 체크: 읽기 권한만 있는 경우 복원 버튼 비활성화
  const isOwner = String(currentDocument?.userId) === String(user?.id);
  const myPermission = currentDocument?.permissions?.find(p => String(p.userId) === String(user?.id));
  const hasWritePermission = isOwner || myPermission?.permissionType === 'WRITE' || myPermission?.permissionType === 'OWNER';
  const canRestore = hasWritePermission;

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollContainerRef = useRef(null);
  const sentinelRef = useRef(null);

  // Disable background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Reset when dependencies change
  useEffect(() => {
    setVersions([]);
    setSelected(null);
    setSelectedId(null);
    setPage(0);
    setHasMore(true);
  }, [workspaceId, documentId]);

  const loadPage = async (pageIndex) => {
    if (loading || loadingMore) return;
    if (pageIndex > 0) setLoadingMore(true); else setLoading(true);
    try {
      const res = await getDocumentVersions(workspaceId, documentId, { page: pageIndex, size: PAGE_SIZE });
      const items = res?.content || [];
      setVersions(prev => {
        if (pageIndex === 0) return items;
        const seen = new Set(prev.map(i => i.id));
        const merged = prev.concat(items.filter(i => !seen.has(i.id)));
        return merged;
      });
      setPage(res?.number ?? pageIndex);
      setHasMore(res ? !res.last : items.length === PAGE_SIZE);
    } finally {
      if (pageIndex > 0) setLoadingMore(false); else setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!workspaceId || !documentId) return;
    loadPage(0);
  }, [workspaceId, documentId]);

  const handleSelect = async (versionId) => {
    log.debug('fetch detail', versionId);
    const detail = await getDocumentVersion(workspaceId, documentId, versionId);
    setSelected(detail);
    setSelectedId(versionId);
    try {
      const props = await getProperties(workspaceId, documentId);
      const map = {};
      (props || []).forEach((p) => { if (p?.id) map[p.id] = p.tagOptions || []; });
      setTagOptionsByPropId(map);
    } catch (e) {
      log.error('failed to load properties for tag labels', e);
      setTagOptionsByPropId({});
    }
  };

  // Auto-select newest after first page loaded
  useEffect(() => {
    if (!selectedId && versions && versions.length > 0) {
      const newest = versions[0];
      if (newest?.id) {
        handleSelect(newest.id);
      }
    }
  }, [versions, selectedId]);

  const handleRestore = async () => {
    if (!selected) return;
    if (!window.confirm('현재 내용을 선택한 버전으로 복구합니다. 계속하시겠습니까?')) return;
    try {
      setRestoring(true);
      log.debug('restore start', selected.id);
      await restoreDocumentVersion(workspaceId, documentId, selected.id);
      log.info('restore success');
      
      // 현재 문서 정보 새로고침
      await fetchDocument(documentId);
      
      // 사이드바의 문서 목록과 자식 문서들도 새로고침하여 변경사항 반영
      await refreshAllChildDocuments();
      
      alert('복구가 완료되었습니다.');
    } catch (e) {
      log.error('restore failed', e);
      alert('복구에 실패했습니다. 권한 또는 네트워크 상태를 확인해 주세요.');
    } finally {
      setRestoring(false);
    }
  };

  // Infinite scroll via IntersectionObserver (reduces re-rendering from scroll events)
  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;
    const root = scrollContainerRef.current;
    const target = sentinelRef.current;
    if (!root || !target) return;
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        loadPage(page + 1);
      }
    }, { root, rootMargin: '0px', threshold: 0.1 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page]);
  
  return (
    <div 
      className="fixed inset-0 flex justify-center items-center bg-black/30" 
      style={{ zIndex: Z_INDEX.VERSION_HISTORY }}
      onClick={onClose}
    >
      <div className="relative bg-white w-[1040px] h-[85vh] rounded-lg shadow-2xl flex" onClick={(e) => e.stopPropagation()}>
        {/* 메인 영역 */}
        <div className="overflow-auto flex-1 p-8">
          <div className="flex items-center mb-4">
            <h3 className="text-2xl font-bold truncate">{selected ? selected.title : ''}</h3>
          </div>
          {!selected && <div className="text-sm text-gray-500">우측 목록에서 버전을 선택하세요.</div>}
          {selected && (
            <div>
              <VersionProperties propertiesJson={selected.propertiesJson} valuesJson={selected.propertyValuesJson} tagOptionsByPropId={tagOptionsByPropId} />
              {selected.content && (
                <>
                  <div className="my-6 border-t border-gray-200" />
                  <div
                    className="max-w-none ProseMirror prose"
                    style={{ minHeight: 'auto', padding: 0 }}
                    dangerouslySetInnerHTML={{ __html: selected.content }}
                  />
                </>
              )}
            </div>
          )}
        </div>
        {/* 우측 버전 기록 */}
        <div className="flex relative flex-col p-4 w-80 h-full rounded-r-lg border-l">
          <div className="mb-3 font-semibold">버전 기록</div>
          {loading && <div className="text-sm">불러오는 중...</div>}
          {!loading && versions.length === 0 && <div className="text-sm text-gray-500">기록 없음</div>}
          <div className="overflow-auto flex-1" ref={scrollContainerRef}>
            <ul className="space-y-2">
              {versions.map(v => {
                const isActive = selectedId === v.id;
                const display = resolveUserDisplay(v.createdBy, currentDocument?.permissions);
                return (
                  <li
                    key={v.id}
                    className={`cursor-pointer rounded px-2 py-1 ${isActive ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                    onClick={() => handleSelect(v.id)}
                  >
                    <div className="text-sm truncate">{v.createdAt ? formatKoreanDateSmart(v.createdAt) : ''}</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <UserBadge name={display.name} email={display.email} profileImageUrl={display.profileImageUrl} size={20} showLabel={true} />
                    </div>
                  </li>
                );
              })}
              {loadingMore && (
                <li className="px-2 py-1 text-xs text-gray-500">더 불러오는 중...</li>
              )}
              {/* Sentinel for IntersectionObserver */}
              <li>
                <div ref={sentinelRef} className="h-8" />
              </li>
            </ul>
          </div>
          <div className="flex justify-end pt-3 border-t">
            <Tooltip 
              content={!canRestore ? '문서의 쓰기 권한을 가진 사용자만 복원이 가능합니다' : ''} 
              side="top"
              delayDuration={300}
              className="whitespace-nowrap"
            >
              <Button className="w-16" onClick={handleRestore} disabled={restoring || !canRestore}>
                {restoring ? '복원 중...' : '복원'}
              </Button>
            </Tooltip>
          </div>
        </div>
        {/* 닫기 버튼: ui/dialog 스타일과 유사하게 */}
        <button
          type="button"
          className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity ring-offset-background hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={onClose}
          aria-label="close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );
}

export default React.memo(VersionHistoryPanel);