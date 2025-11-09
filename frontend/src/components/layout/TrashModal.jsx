import React, { useEffect, useRef, useLayoutEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip } from '@/components/ui/tooltip';
import { TrashIcon, Undo, FileText, Table } from 'lucide-react';
import { cn } from '@/lib/utils';
import useTrash from '@/hooks/useTrash';
import { createLogger } from '@/lib/logger';
import { Z_INDEX } from '@/constants/zIndex';
import { useAuth } from '@/contexts/AuthContext';
import { hasWritePermission } from '@/utils/permissionUtils';
import { getDocument } from '@/services/documentApi';

export default function TrashModal({ open, onClose, workspaceId, anchorRef, onRestore }) {
  const dialogRef = useRef(null);
  const [dialogPosition, setDialogPosition] = React.useState({ left: 0, bottom: 0, position: 'fixed' });
  const {
    trashedDocuments,
    loading,
    fetchTrashedDocuments,
    handleRestore,
    handleDelete,
    handleDeleteAll,
  } = useTrash(workspaceId);
  const { user } = useAuth();
  const log = createLogger('trash');
  const [parentDocsCache, setParentDocsCache] = useState({}); // 부모 문서 캐시

  // 쓰기 권한이 있는 문서가 하나라도 있는지 확인
  const hasAnyWritableDocument = trashedDocuments.some(doc => hasWritePermission(doc, user));

  // 부모 문서 조회 (캐시 사용)
  useEffect(() => {
    if (!workspaceId || !open || trashedDocuments.length === 0) return;
    
    const fetchParentDocs = async () => {
      const parentIds = new Set();
      trashedDocuments.forEach(doc => {
        if (doc.parentId) {
          // 휴지통에 없는 부모만 조회
          const parentInTrash = trashedDocuments.find(d => String(d.id) === String(doc.parentId));
          if (!parentInTrash && !parentDocsCache[doc.parentId]) {
            parentIds.add(doc.parentId);
          }
        }
      });

      // 조회할 부모가 없으면 스킵
      if (parentIds.size === 0) return;

      const newCache = { ...parentDocsCache };
      const promises = Array.from(parentIds).map(async (parentId) => {
        try {
          const parentDoc = await getDocument(workspaceId, parentId);
          newCache[parentId] = parentDoc;
        } catch (err) {
          log.warn('부모 문서 조회 실패', { parentId, error: err });
        }
      });
      
      await Promise.all(promises);
      setParentDocsCache(newCache);
    };

    fetchParentDocs();
  }, [workspaceId, open, trashedDocuments, parentDocsCache]);

  // 문서 경로 계산 함수 (trashedDocuments와 parentDocsCache를 모두 사용)
  // 경로는 [루트, 부모1, 부모2, ..., 현재문서] 순서로 구성됨
  const getDocumentPath = useMemo(() => {
    return (doc) => {
      const path = [];
      let currentDoc = doc;
      const visited = new Set(); // 순환 참조 방지
      
      // 현재 문서부터 시작해서 루트까지 올라가며 경로 구성
      while (currentDoc && !visited.has(currentDoc.id)) {
        visited.add(currentDoc.id);
        path.unshift(currentDoc); // 앞에 추가하므로 [루트, ..., 부모, 현재문서] 순서
        if (!currentDoc.parentId) break;
        
        // 먼저 휴지통에서 찾기
        let parent = trashedDocuments.find(d => String(d.id) === String(currentDoc.parentId));
        // 휴지통에 없으면 캐시에서 찾기
        if (!parent && parentDocsCache[currentDoc.parentId]) {
          parent = parentDocsCache[currentDoc.parentId];
        }
        
        if (!parent) break; // 부모를 찾을 수 없으면 여기까지
        currentDoc = parent;
      }
      return path;
    };
  }, [trashedDocuments, parentDocsCache]);

  // 경로를 문자열로 변환 (길면 축약, 현재 문서 제외하고 부모 경로만 표시)
  const formatPath = (path) => {
    if (!path || path.length <= 1) return null; // 부모가 없으면 표시 안 함
    
    // path = [루트, 부모1, 부모2, ..., 현재문서]
    // 현재 문서를 제외한 부모 경로만 사용 (마지막 요소 제외)
    const parentPath = path.slice(0, -1);
    if (parentPath.length === 0) return null;
    
    // 경로가 길면 앞부분과 끝부분만 표시
    if (parentPath.length > 3) {
      const first = parentPath[0]?.title || '(제목 없음)';
      const last = parentPath[parentPath.length - 1]?.title || '(제목 없음)';
      return `${first} / ... / ${last}`;
    }
    
    return parentPath.map(doc => doc?.title || '(제목 없음)').join(' / ');
  };

  // 휴지통 문서 목록 fetch (open, workspaceId 변경 시)
  useEffect(() => {
    if (!open || !workspaceId) return;
    fetchTrashedDocuments();
  }, [open, workspaceId]);

  // 위치 계산 함수 분리
  function calculateDialogPosition(anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      log.warn('TrashModal: anchorRef의 getBoundingClientRect 값이 0입니다.', rect);
      return null;
    }
    // viewport 고정 기준으로 버튼의 bottom에 모달 bottom을 맞춤
    const left = rect.right + 8;
    const bottom = Math.max(0, window.innerHeight - rect.bottom);
    return {
      left,
      bottom,
      position: 'fixed',
    };
  }

  // 위치 계산 (open, anchorRef, workspaceId, trashedDocuments.length 변경 시)
  useLayoutEffect(() => {
    if (!open || !workspaceId) return;
    if (!anchorRef?.current) {
      log.warn('TrashModal: anchorRef.current가 null입니다.');
      return;
    }
    const pos = calculateDialogPosition(anchorRef.current);
    if (pos) setDialogPosition(pos);
  }, [open, anchorRef, workspaceId, trashedDocuments.length]);

  // 창 리사이즈/애니메이션 종료 시 재측정 (fixed 기준이므로 scroll 핸들러 불필요)
  useEffect(() => {
    if (!open) return;
    const handler = () => {
      if (!anchorRef?.current) return;
      const pos = calculateDialogPosition(anchorRef.current);
      if (pos) setDialogPosition(pos);
    };
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
    };
  }, [open, anchorRef]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
        {/* 오버레이(배경) 제거, 포탈 사용 안 함 */}
        <DialogContent
          ref={dialogRef}
          overlay={false}
          noDefaultStyle={true}
          style={{
            position: dialogPosition.position,
            left: dialogPosition.left,
            bottom: dialogPosition.bottom,
            margin: 0,
            transform: 'none',
            minWidth: 320,
            maxWidth: 400,
            zIndex: Z_INDEX.MODAL,
            transformOrigin: 'bottom left',
          }}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            "p-6 bg-white rounded-lg border shadow-xl transition-none",
            open ? "animate-trash-dialog-in" : "animate-trash-dialog-out"
          )}
        >
          <DialogHeader>
            <DialogTitle>휴지통</DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="py-8 text-center text-gray-400">로딩 중...</div>
          ) : trashedDocuments.length === 0 ? (
            <div className="py-8 text-center text-gray-400">휴지통이 비어 있습니다.</div>
          ) : (
            <ul className="overflow-y-auto max-h-80 divide-y">
              {trashedDocuments.map(doc => {
                const canWrite = hasWritePermission(doc, user);
                const Icon = doc.viewType === 'TABLE' ? Table : FileText;
                const path = getDocumentPath(doc);
                const pathString = formatPath(path);
                
                // 디버깅: 경로가 있는데 표시되지 않는 경우 확인
                if (doc.parentId && !pathString) {
                  console.warn('경로 표시 안 됨', { 
                    docId: doc.id, 
                    docTitle: doc.title, 
                    parentId: doc.parentId,
                    pathLength: path.length,
                    path: path.map(p => ({ id: p.id, title: p.title })),
                    pathDetails: path
                  });
                }
                
                return (
                  <li key={doc.id} className="flex items-start gap-3 py-2">
                    {/* 아이콘 */}
                    <Icon className="w-5 h-5 pt-1 text-gray-400 flex-shrink-0" />
                    
                    {/* 문서 정보 (제목 + 경로) */}
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 truncate">{doc.title || '(제목 없음)'}</div>
                      {pathString && (
                        <div className="text-xs text-gray-500 truncate mt-0.5">{pathString}</div>
                      )}
                    </div>
                    
                    {/* 액션 버튼 */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Tooltip
                        content={!canWrite ? '문서의 쓰기 권한을 가진 사용자만 복원이 가능합니다' : ''}
                        side="top"
                        delayDuration={300}
                        className="whitespace-nowrap"
                      >
                        <button 
                          onClick={() => handleRestore(doc.id, onRestore)} 
                          disabled={!canWrite}
                          className={cn(
                            "p-1 transition-colors",
                            canWrite ? "hover:text-blue-500" : "opacity-30 cursor-not-allowed"
                          )}
                        >
                          <Undo className="w-5 h-5" />
                        </button>
                      </Tooltip>
                      <Tooltip
                        content={!canWrite ? '문서의 쓰기 권한을 가진 사용자만 삭제가 가능합니다' : ''}
                        side="top"
                        delayDuration={300}
                        className="whitespace-nowrap"
                      >
                        <button 
                          onClick={() => handleDelete(doc.id)} 
                          disabled={!canWrite}
                          className={cn(
                            "p-1 transition-colors",
                            canWrite ? "hover:text-red-500" : "opacity-30 cursor-not-allowed"
                          )}
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </Tooltip>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            onClick={handleDeleteAll}
            className="py-2 mt-4 w-full text-white bg-red-700 rounded hover:bg-red-800 disabled:opacity-50"
            disabled={!hasAnyWritableDocument || loading}
            title={!hasAnyWritableDocument ? "쓰기 권한이 있는 문서가 없습니다" : "쓰기 권한이 있는 문서만 삭제됩니다"}
          >
            모두 비우기
          </button>
        </DialogContent>
    </Dialog>
  );
} 