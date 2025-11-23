import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { getDocumentVersions, getDocumentVersion, restoreDocumentVersion, getProperties } from '@/services/documentApi';
import { createLogger } from '@/lib/logger';
import { useDocument } from '@/contexts/DocumentContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatKoreanDateSmart } from '@/lib/utils';
import { hasWritePermission } from '@/utils/permissionUtils';
import { getColorObj } from '@/lib/colors';
import UserBadge from '@/components/documents/shared/UserBadge';
import { resolveUserDisplay } from '@/components/documents/shared/resolveUserDisplay';
import { Z_INDEX } from '@/constants/zIndex';
import { toast } from '@/hooks/useToast';
import { useErrorHandler } from '@/hooks/useErrorHandler';

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

const PAGE_SIZE = 20;

function VersionHistoryPanel({ workspaceId, documentId, onClose }) {
  const [selectedId, setSelectedId] = useState(null);
  const queryClient = useQueryClient();
  const log = createLogger('version');
  const { handleError } = useErrorHandler();
  const { fetchDocument, currentDocument, refreshAllChildDocuments } = useDocument();
  const { user } = useAuth();

  // 권한 체크: 읽기 권한만 있는 경우 복원 버튼 비활성화
  const canRestore = hasWritePermission(currentDocument, user);

  const scrollContainerRef = useRef(null);
  const sentinelRef = useRef(null);

  // React Query로 문서 버전 목록 조회 (무한 스크롤)
  const {
    data: versionsData,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    hasNextPage: hasMore,
    fetchNextPage,
    error: versionsQueryError,
  } = useInfiniteQuery({
    queryKey: ['document-versions', workspaceId, documentId],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await getDocumentVersions(workspaceId, documentId, { page: pageParam, size: PAGE_SIZE });
      return {
        versions: res?.content || [],
        page: res?.number ?? pageParam,
        totalPages: res?.totalPages || 0,
        hasMore: res ? !res.last : (res?.content || []).length === PAGE_SIZE,
      };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 0,
    enabled: !!workspaceId && !!documentId,
    staleTime: 1000 * 60 * 2, // 2분
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (versionsQueryError) {
      log.error('문서 버전 목록 조회 실패', versionsQueryError);
      handleError(versionsQueryError, {
        customMessage: '문서 버전 목록을 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [versionsQueryError, handleError]);

  // 모든 버전을 하나의 배열로 합치기
  const versions = useMemo(() => {
    if (!versionsData?.pages) return [];
    return versionsData.pages.flatMap((page) => page.versions);
  }, [versionsData]);

  // 선택된 버전 상세 조회
  const {
    data: selected,
    isLoading: selectedLoading,
    error: selectedError,
  } = useQuery({
    queryKey: ['document-version', workspaceId, documentId, selectedId],
    queryFn: () => getDocumentVersion(workspaceId, documentId, selectedId),
    enabled: !!workspaceId && !!documentId && !!selectedId,
    staleTime: 1000 * 60 * 5, // 5분
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (selectedError) {
      log.error('문서 버전 상세 조회 실패', selectedError);
      handleError(selectedError, {
        customMessage: '문서 버전 상세 정보를 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [selectedError, handleError]);

  // 속성 조회 (태그 옵션용)
  const {
    data: propertiesData,
    error: propertiesError,
  } = useQuery({
    queryKey: ['version-properties', workspaceId, documentId],
    queryFn: () => getProperties(workspaceId, documentId),
    enabled: !!workspaceId && !!documentId && !!selectedId,
    staleTime: 1000 * 60 * 5, // 5분
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (selectedError) {
      log.error('문서 버전 상세 조회 실패', selectedError);
      handleError(selectedError, {
        customMessage: '문서 버전 상세 정보를 불러오지 못했습니다.',
        showToast: true
      });
    }
    if (propertiesError) {
      log.error('속성 조회 실패 (버전 히스토리)', propertiesError);
      handleError(propertiesError, {
        customMessage: '속성 정보를 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [selectedError, propertiesError, handleError]);

  // 태그 옵션 맵 생성
  const tagOptionsByPropId = useMemo(() => {
    if (!propertiesData) return {};
    const map = {};
    (propertiesData || []).forEach((p) => {
      if (p?.id) map[p.id] = p.tagOptions || [];
    });
    return map;
  }, [propertiesData]);

  // 버전 복원 mutation
  const restoreMutation = useMutation({
    mutationFn: (versionId) => restoreDocumentVersion(workspaceId, documentId, versionId),
    onSuccess: async () => {
      log.info('restore success');
      // 현재 문서 정보 새로고침
      await fetchDocument(documentId);
      // 사이드바의 문서 목록과 자식 문서들도 새로고침하여 변경사항 반영
      await refreshAllChildDocuments();
      // 버전 목록도 새로고침
      queryClient.invalidateQueries({ queryKey: ['document-versions', workspaceId, documentId] });
      toast({
        title: '복구 완료',
        description: '복구가 완료되었습니다.',
        variant: 'success',
      });
    },
    onError: (e) => {
      log.error('문서 복구 실패', e);
      handleError(e, {
        customMessage: '복구에 실패했습니다. 권한 또는 네트워크 상태를 확인해 주세요.',
        showToast: true
      });
    },
  });

  const restoring = restoreMutation.isPending;

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
    setSelectedId(null);
  }, [workspaceId, documentId]);

  const handleSelect = (versionId) => {
    log.debug('select version', versionId);
    setSelectedId(versionId);
  };

  // Auto-select newest after first page loaded
  useEffect(() => {
    if (!selectedId && versions && versions.length > 0) {
      const newest = versions[0];
      if (newest?.id) {
        setSelectedId(newest.id);
      }
    }
  }, [versions, selectedId]);

  const handleRestore = () => {
    if (!selected) return;
    if (!window.confirm('현재 내용을 선택한 버전으로 복구합니다. 계속하시겠습니까?')) return;
    log.debug('restore start', selected.id);
    restoreMutation.mutate(selected.id);
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
        fetchNextPage();
      }
    }, { root, rootMargin: '0px', threshold: 0.1 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, fetchNextPage]);
  
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