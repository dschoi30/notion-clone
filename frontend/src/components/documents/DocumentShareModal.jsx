import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogPortal, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { inviteToDocument } from '@/services/documentApi';
import { useDocument } from '@/contexts/DocumentContext';

export default function DocumentShareModal({ open, onClose, workspaceId, documentId, anchorRef }) {
  const dialogRef = useRef(null);
  const [dialogPosition, setDialogPosition] = useState({ top: 0, left: 0 });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState(null);
  const { currentDocument } = useDocument();
  const permissions = currentDocument?.permissions || [];
console.log(permissions)
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

  // 권한 한글 매핑
  const permissionTypeLabel = {
    READ: '읽기 허용',
    WRITE: '전체 허용',
    OWNER: '전체 허용',
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
          <div className="flex gap-2 my-2">
            <input
              type="email"
              className="flex-1 px-2 py-1 border rounded"
              placeholder="초대할 이메일 입력"
              value={inviteEmail}
              onChange={e => {
                setInviteEmail(e.target.value);
                setInviteStatus(null);
              }}
            />
            <Button
              size="sm"
              onClick={handleInvite}
              disabled={!inviteEmail}
            >
              초대
            </Button>
          </div>
          <div className="mt-2">
            {permissions.length === 0 ? (
              <div className="text-sm text-gray-400">아직 초대한 사람이 없습니다.</div>
            ) : (
              <ul className="divide-y">
                {permissions.map((p) => (
                  <li key={p.userId} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 text-base font-bold text-gray-700 bg-gray-200 rounded-full select-none">
                        {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="font-medium leading-tight">{p.name}</span>
                        <span className="text-xs leading-tight text-gray-500">{p.email}</span>
                      </div>
                    </div>
                    <span className="text-xs text-blue-600">{permissionTypeLabel[p.permissionType] || p.permissionType}</span>
                  </li>
                ))}
              </ul>
            )}
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