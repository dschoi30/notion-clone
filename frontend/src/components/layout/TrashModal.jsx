import React, { useEffect, useState } from 'react';
import { Dialog, DialogPortal, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrashIcon, Undo } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getTrashedDocuments,
  restoreDocument,
  deleteDocumentPermanently,
  emptyTrash
} from '@/services/trashApi';

// props: open, onClose, workspaceId, anchorRef
export default function TrashModal({ open, onClose, workspaceId, anchorRef }) {
  const [trashedDocuments, setTrashedDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogPosition, setDialogPosition] = useState({ top: 0, left: 0 });
  const dialogRef = React.useRef(null);

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
    setLoading(true);
    getTrashedDocuments(workspaceId)
      .then(setTrashedDocuments)
      .catch(() => {
        setTrashedDocuments([]);
        alert('휴지통 목록을 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }, [open, workspaceId]);

  const handleRestore = async (docId) => {
    try {
      await restoreDocument(workspaceId, docId);
      setTrashedDocuments(docs => docs.filter(d => d.id !== docId));
    } catch (e) {
      alert('문서 복원에 실패했습니다.');
    }
  };

  const handleDelete = async (docId) => {
    try {
      await deleteDocumentPermanently(workspaceId, docId);
      setTrashedDocuments(docs => docs.filter(d => d.id !== docId));
    } catch (e) {
      alert('문서 완전 삭제에 실패했습니다.');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await emptyTrash(workspaceId);
      setTrashedDocuments([]);
    } catch (e) {
      alert('휴지통 전체 비우기에 실패했습니다.');
    }
  };

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
            <di className="py-8 text-center text-gray-400">로딩 중...</di  v>
          ) : trashedDocuments.length === 0 ? (
            <div className="py-8 text-center text-gray-400">휴지통이 비어 있습니다.</div>
          ) : (
            <ul className="overflow-y-auto divide-y max-h-80">
              {trashedDocuments.map(doc => (
                <li key={doc.id} className="flex items-center justify-between py-2">
                  <span className="max-w-xs truncate">{doc.title || '(제목 없음)'}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleRestore(doc.id)} title="복원" className="p-1 hover:text-blue-500">
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