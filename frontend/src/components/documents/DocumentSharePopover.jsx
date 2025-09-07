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
import UserBadge from '@/components/documents/shared/UserBadge';

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
  const [localPermissions, setLocalPermissions] = useState(permissions);
  const [isDirty, setIsDirty] = useState(false);
  const { user } = useAuth();
  const [loadingUserId, setLoadingUserId] = useState(null);
  const { fetchDocument } = useDocument();
  const isDocOwner = currentDocument && String(currentDocument.userId) === String(user.id);

  useEffect(() => {
    if (open) {
      setLocalPermissions(permissions);
    }
  }, [open, permissions]);

  // 팝오버 닫힘(언마운트) 시 서버 최신 상태를 전역에 적용해 다음 오픈 시 최신 라벨이 보이도록 동기화

  // 언마운트 시에도 동기화(부모에서 조건부 렌더로 즉시 언마운트되므로 안전장치)
  useEffect(() => {
    return () => {
      if (isDirty && documentId) {
        fetchDocument(documentId, { silent: true, apply: true });
      }
    };
  }, [isDirty, documentId, fetchDocument]);

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
      // 권한 변경 직후 전체 문서를 교체 적용하면 일시적으로 작성자 시점이 읽기 전용으로 보이는 깜빡임이 발생할 수 있어
      // 서버에서 최신 데이터를 미리 받아오되, 현재 문서 상태에는 미적용
      await fetchDocument(documentId, { silent: true, apply: false });

      // 로컬 목록을 즉시 반영하여 팝오버 UI가 최신 권한을 표시하도록 처리
      setLocalPermissions(prev => {
        if (value === 'REMOVE') {
          return prev.filter(p => String(p.userId) !== String(userId));
        }
        const exists = prev.some(p => String(p.userId) === String(userId));
        if (!exists) return prev;
        return prev.map(p => (
          String(p.userId) === String(userId) ? { ...p, permissionType: value } : p
        ));
      });
      setIsDirty(true);
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
            zIndex: 9998,
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
            {localPermissions.length === 0 ? (
              <div className="text-sm text-gray-400">아직 초대한 사람이 없습니다.</div>
            ) : (
              <ul className="divide-y">
                {localPermissions.map((p) => (
                  <li key={p.userId} className="flex justify-between items-center py-1">
                    <div className="flex gap-2 items-center">
                      <UserBadge name={p.name} email={p.email} profileImageUrl={p.profileImageUrl} size={32} showLabel={false} />
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