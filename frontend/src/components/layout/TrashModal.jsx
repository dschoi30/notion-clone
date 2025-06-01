import React, { useEffect, useRef } from 'react';
import { Dialog, DialogPortal, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrashIcon, Undo } from 'lucide-react';
import { cn } from '@/lib/utils';
import useTrash from '@/hooks/useTrash';

// props: open, onClose, workspaceId, anchorRef, onRestore
export default function TrashModal({ open, onClose, workspaceId, anchorRef, onRestore }) {
  const dialogRef = useRef(null);
  const [dialogPosition, setDialogPosition] = React.useState({ top: 0, left: 0 });
  const {
    trashedDocuments,
    loading,
    fetchTrashedDocuments,
    handleRestore,
    handleDelete,
    handleDeleteAll,
  } = useTrash(workspaceId);

  // 휴지통 메뉴 위치 계산 (다이얼로그 하단이 버튼 하단에 맞도록)
  useEffect(() => {
    if (!open || !workspaceId || !anchorRef?.current) return;
    const timer = setTimeout(() => {
      const rect = anchorRef.current.getBoundingClientRect();
      let dialogHeight = 0;
      if (dialogRef.current) {
        dialogHeight = dialogRef.current.offsetHeight;
      } else {
        dialogHeight = 400; // 예상 높이 fallback
      }
      setDialogPosition({
        top: rect.bottom - dialogHeight + window.scrollY, // 다이얼로그 하단과 메뉴 하단 일치
        left: rect.right + 8 + window.scrollX,           // 메뉴 오른쪽에 8px 여백
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [open, anchorRef, workspaceId]);

  // 휴지통 문서 목록 fetch
  useEffect(() => {
    if (!open || !workspaceId) return;
    fetchTrashedDocuments();
    // eslint-disable-next-line
  }, [open, workspaceId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogPortal>
        {/* 오버레이(배경) 제거 */}
        <DialogContent
          ref={dialogRef}
          overlay={false}
          style={{
            position: 'absolute',
            top: dialogPosition.top,
            left: dialogPosition.left,
            margin: 0,
            transform: 'none',
            minWidth: 320,
            maxWidth: 400,
            zIndex: 50,
            transformOrigin: 'bottom left',
          }}
          className={cn(
            "shadow-xl border bg-white p-6 rounded-lg transition-none",
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
            <ul className="overflow-y-auto divide-y max-h-80">
              {trashedDocuments.map(doc => (
                <li key={doc.id} className="flex items-center justify-between py-2">
                  <span className="max-w-xs truncate">{doc.title || '(제목 없음)'}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleRestore(doc.id, onRestore)} title="복원" className="p-1 hover:text-blue-500">
                      <Undo className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(doc.id)} title="완전 삭제" className="p-1 hover:text-red-500">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={handleDeleteAll}
            className="w-full py-2 mt-4 text-white bg-red-700 rounded hover:bg-red-800 disabled:opacity-50"
            disabled={trashedDocuments.length === 0 || loading}
          >
            모두 비우기
          </button>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
} 