import React, { useEffect, useRef, useLayoutEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip } from '@/components/ui/tooltip';
import { TrashIcon, Undo } from 'lucide-react';
import { cn } from '@/lib/utils';
import useTrash from '@/hooks/useTrash';
import { createLogger } from '@/lib/logger';
import { Z_INDEX } from '@/constants/zIndex';
import { useAuth } from '@/contexts/AuthContext';
import { hasWritePermission } from '@/utils/permissionUtils';

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

  // 쓰기 권한이 있는 문서가 하나라도 있는지 확인
  const hasAnyWritableDocument = trashedDocuments.some(doc => hasWritePermission(doc, user));

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
                return (
                  <li key={doc.id} className="flex justify-between items-center py-2">
                    <span className="max-w-xs truncate">{doc.title || '(제목 없음)'}</span>
                    <div className="flex gap-2">
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