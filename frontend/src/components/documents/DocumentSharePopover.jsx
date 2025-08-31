import React, { useEffect, useRef, useState, useLayoutEffect, useId } from 'react';
import { Dialog, DialogPortal, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { inviteToDocument, updateDocumentPermission, removeDocumentPermission } from '@/services/documentApi';
import { useDocument } from '@/contexts/DocumentContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

function PermissionDropdown({ value, onChange, disabled, loading, menuEnabled = true }) {
  const options = [
    { value: 'WRITE', label: '전체 허용' },
    { value: 'READ', label: '읽기 허용' },
    { value: 'REMOVE', label: '제거' },
  ];
  const isOwner = value === 'OWNER';
  const selected = options.find(o => o.value === value);
  const displayLabel = isOwner ? '작성자' : (selected?.label || value);
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={menuEnabled ? open : false} onOpenChange={(next) => { if (menuEnabled) setOpen(next); }}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`text-xs border rounded px-2 py-1 bg-white min-w-[80px] text-left flex items-center justify-between ${(disabled || isOwner || !menuEnabled) ? 'opacity-60 cursor-not-allowed' : 'hover:border-gray-400'} ${loading ? 'opacity-60' : ''}`}
          disabled={disabled || loading || isOwner || !menuEnabled}
        >
          <span>{displayLabel}</span>
          <ChevronDown className="ml-1 w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      {!isOwner && menuEnabled && (
        <DropdownMenuContent align="end" className="min-w-[100px]">
          {options.map(opt => (
            <DropdownMenuItem
              key={opt.value}
              onSelect={(e) => {
                if (disabled || loading) {
                  e.preventDefault();
                  return;
                }
                if (opt.value !== value) onChange(opt.value);
              }}
              disabled={disabled || loading || opt.value === value}
              className={opt.value === value ? 'font-bold text-blue-600' : ''}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}

export default function DocumentSharePopover({ open, onClose, workspaceId, documentId, anchorRef }) {
  const dialogRef = useRef(null);
  const descriptionId = useId();
  const inviteInputRef = useRef(null);
  const [popoverWidth, setPopoverWidth] = useState(280);
  const [dialogPosition, setDialogPosition] = useState({ top: 0, left: 0 });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState(null);
  const { currentDocument } = useDocument();
  const permissions = currentDocument?.permissions || [];
  const { user } = useAuth();
  const [loadingUserId, setLoadingUserId] = useState(null);
  const { fetchDocument } = useDocument();
  const isDocOwner = currentDocument && String(currentDocument.userId) === String(user.id);

  useEffect(() => {
    if (open && dialogRef.current) {
      const width = dialogRef.current.offsetWidth;
      if (width && width !== popoverWidth) {
        setPopoverWidth(width);
      }
    }
  }, [open, dialogRef.current]);

  useEffect(() => {
    if (open && inviteInputRef.current) {
      inviteInputRef.current.focus();
    }
  }, [open, dialogPosition]);

  useLayoutEffect(() => {
    if (!open || !workspaceId || !documentId || !anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    let idealLeft = rect.right - popoverWidth + window.scrollX;
    let maxLeft = window.innerWidth - popoverWidth;
    let left = Math.min(idealLeft, maxLeft);
    if (left < 0) left = 0;
    setDialogPosition({
      top: rect.bottom + window.scrollY,
      left,
    });
  }, [open, anchorRef, workspaceId, documentId, popoverWidth]);

  const handleInvite = async () => {
    if (!inviteEmail || !workspaceId || !documentId || !isDocOwner) return;
    try {
      await inviteToDocument(workspaceId, documentId, inviteEmail);
      setInviteStatus('success');
      setInviteEmail('');
    } catch (e) {
      setInviteStatus('error');
    }
  };

  const handlePermissionChange = async (userId, value) => {
    if (!isDocOwner) return;
    setLoadingUserId(userId);
    try {
      if (value === 'REMOVE') {
        if (window.confirm('정말로 이 사용자의 권한을 제거하시겠습니까?')) {
          await removeDocumentPermission(workspaceId, documentId, userId);
        } else {
          setLoadingUserId(null);
          return;
        }
      } else {
        await updateDocumentPermission(workspaceId, documentId, userId, value);
      }
      await fetchDocument(documentId);
    } catch (e) {
      alert('권한 변경/제거에 실패했습니다.');
    }
    setLoadingUserId(null);
  };

  if (!open) return null;

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
          className="p-6 bg-white rounded-lg border shadow-xl transition-none"
          aria-describedby={descriptionId}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>문서 공유</DialogTitle>
          </DialogHeader>
          <DialogDescription id={descriptionId} className="sr-only">
            문서 공유 설정
          </DialogDescription>
          <div className="flex gap-2 my-2">
            <input
              type="email"
              className="flex-1 px-2 py-1 rounded border"
              placeholder="초대할 이메일 입력"
              value={inviteEmail}
              ref={inviteInputRef}
              autoFocus
              onChange={e => {
                setInviteEmail(e.target.value);
                setInviteStatus(null);
              }}
            />
            <Button
              size="sm"
              onClick={handleInvite}
              disabled={!inviteEmail || !isDocOwner}
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
                  <li key={p.userId} className="flex justify-between items-center py-1">
                    <div className="flex gap-2 items-center">
                      <div className="flex justify-center items-center w-8 h-8 text-base font-bold text-gray-700 bg-gray-200 rounded-full select-none">
                        {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="font-medium leading-tight">{p.name}</span>
                        <span className="text-xs leading-tight text-gray-500">{p.email}</span>
                      </div>
                    </div>
                    <PermissionDropdown
                      value={p.permissionType}
                      onChange={val => handlePermissionChange(p.userId, val)}
                      disabled={!isDocOwner || p.userId === user.id}
                      menuEnabled={isDocOwner}
                      loading={loadingUserId === p.userId}
                    />
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