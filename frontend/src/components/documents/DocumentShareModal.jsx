import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogPortal, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { inviteToDocument } from '@/services/documentApi';

export default function DocumentShareModal({ open, onClose, workspaceId, documentId, anchorRef }) {
  const dialogRef = useRef(null);
  const [dialogPosition, setDialogPosition] = useState({ top: 0, left: 0 });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState(null);

  // 위치 계산 (모달 우측 끝이 공유 버튼 우측 끝과 일치)
  useEffect(() => {
    if (!open || !workspaceId || !documentId || !anchorRef?.current) return;
    const timer = setTimeout(() => {
      const rect = anchorRef.current.getBoundingClientRect();
      let modalWidth = dialogRef.current ? dialogRef.current.offsetWidth : 280;
      setDialogPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right - modalWidth + window.scrollX,
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [open, anchorRef, workspaceId, documentId]);

  const handleInvite = async () => {
    if (!inviteEmail || !workspaceId || !documentId) return;
    try {
      await inviteToDocument(workspaceId, documentId, inviteEmail);
      setInviteStatus('success');
      setInviteEmail('');
    } catch (e) {
      setInviteStatus('error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogPortal>
        <DialogContent
          ref={dialogRef}
          overlay={false}
          noDefaultStyle={true}
          style={{
            position: 'absolute',
            top: dialogPosition.top,
            left: dialogPosition.left,
            margin: 0,
            transform: 'none',
            minWidth: 280,
            zIndex: 50,
            transformOrigin: 'top right',
          }}
          className="p-6 transition-none bg-white border rounded-lg shadow-xl"
        >
          <DialogHeader>
            <DialogTitle>문서 공유</DialogTitle>
          </DialogHeader>
          <input
            type="email"
            className="w-full px-2 py-1 my-2 border rounded"
            placeholder="초대할 이메일 입력"
            value={inviteEmail}
            onChange={e => {
              setInviteEmail(e.target.value);
              setInviteStatus(null);
            }}
          />
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              className="w-full"
              onClick={handleInvite}
              disabled={!inviteEmail}
            >
              초대
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="w-full"
              onClick={onClose}
            >
              닫기
            </Button>
          </div>
          {inviteStatus === 'success' && (
            <div className="mt-2 text-sm text-green-600">초대 메시지를 보냈습니다.</div>
          )}
          {inviteStatus === 'error' && (
            <div className="mt-2 text-sm text-red-600">초대 실패. 이메일을 확인하세요.</div>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
} 