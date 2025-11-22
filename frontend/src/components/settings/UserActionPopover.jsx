import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/useToast';
import {
  updateUserRole,
  resetUserPassword,
  toggleUserStatus,
  deleteUser
} from '@/services/userApi';
import { ChevronDown, Lock, MoreVertical, UserCheck, Trash2 } from 'lucide-react';
import { Z_INDEX } from '@/constants/zIndex';

/**
 * 사용자 관리 팝오버 컴포넌트
 * SUPER_ADMIN이 다른 사용자를 관리하기 위한 메뉴
 */
function UserActionPopover({
  user,
  anchorRef,
  onActionComplete,
  isOpen,
  onClose,
  currentUserRole
}) {
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'resetPassword' | 'toggleStatus' | 'deleteUser'
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const contentRef = useRef(null);

  // 외부 클릭 감지하여 팝오버 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      // 다이얼로그가 열려있으면 외부 클릭 무시
      if (isConfirmDialogOpen) return;
      
      // 드롭다운 메뉴가 열려있으면 외부 클릭 무시
      if (isRoleMenuOpen) return;

      // 팝오버 내부 클릭인지 확인
      if (contentRef.current && contentRef.current.contains(event.target)) {
        return;
      }

      // 앵커 요소 클릭인지 확인 (팝오버를 열었던 버튼)
      // anchorRef가 ref 객체인 경우와 DOM 요소인 경우 모두 처리
      if (anchorRef) {
        const anchorElement = anchorRef.current || anchorRef;
        if (anchorElement && anchorElement.contains && anchorElement.contains(event.target)) {
          return;
        }
      }

      // 외부 클릭이면 팝오버 닫기
      onClose?.();
    };

    // 이벤트 리스너 추가 (약간의 지연을 두어 현재 클릭 이벤트가 처리된 후 실행)
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isConfirmDialogOpen, isRoleMenuOpen, anchorRef, onClose]);

  // SUPER_ADMIN만 이 기능을 사용할 수 있음
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN';

  // 자신의 계정은 역할 변경 불가능 (프론트에서 체크)
  const canChangeRole = isSuperAdmin;
  const canResetPassword = isSuperAdmin;
  const canToggleStatus = isSuperAdmin;
  const canDelete = isSuperAdmin;

  // 역할 옵션
  const roleOptions = [
    { value: 'SUPER_ADMIN', label: '슈퍼 관리자' },
    { value: 'ADMIN', label: '관리자' },
    { value: 'USER', label: '사용자' },
  ];

  /**
   * 역할 변경 처리
   */
  const handleRoleChange = useCallback(async (newRole) => {
    if (newRole === user.role) {
      toast({
        variant: 'default',
        title: '동일한 역할',
        description: '현재와 같은 역할입니다.',
      });
      return;
    }

    setIsLoading(true);
    try {
      await updateUserRole(user.id, newRole);

      toast({
        variant: 'default',
        title: '역할 변경 완료',
        description: `${user.email}의 역할을 변경했습니다.`,
      });

      // 부모 컴포넌트에 변경 알림
      onActionComplete?.('roleChanged', { userId: user.id, newRole });
      onClose?.();
    } catch (error) {
      console.error('역할 변경 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: error.response?.data?.message || '역할 변경에 실패했습니다.',
      });
    } finally {
      setIsLoading(false);
      setIsRoleMenuOpen(false);
    }
  }, [user, toast, onActionComplete, onClose]);

  /**
   * 비밀번호 재설정
   */
  const handleResetPassword = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await resetUserPassword(user.id);

      toast({
        variant: 'default',
        title: '비밀번호 재설정',
        description: `임시 비밀번호: ${response.temporaryPassword || '이메일로 발송됨'}`,
      });

      onActionComplete?.('passwordReset', { userId: user.id });
      setIsConfirmDialogOpen(false);
      onClose?.();
    } catch (error) {
      console.error('비밀번호 재설정 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: error.response?.data?.message || '비밀번호 재설정에 실패했습니다.',
      });
    } finally {
      setIsLoading(false);
      setConfirmAction(null);
    }
  }, [user, toast, onActionComplete, onClose]);

  /**
   * 계정 활성화/비활성화
   */
  const handleToggleStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const newStatus = !user.isActive;
      await toggleUserStatus(user.id, newStatus);

      toast({
        variant: 'default',
        title: '상태 변경 완료',
        description: `계정이 ${newStatus ? '활성화' : '비활성화'}되었습니다.`,
      });

      onActionComplete?.('statusChanged', { userId: user.id, isActive: newStatus });
      setIsConfirmDialogOpen(false);
      onClose?.();
    } catch (error) {
      console.error('계정 상태 변경 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: error.response?.data?.message || '상태 변경에 실패했습니다.',
      });
    } finally {
      setIsLoading(false);
      setConfirmAction(null);
    }
  }, [user, toast, onActionComplete, onClose]);

  /**
   * 계정 삭제
   */
  const handleDeleteUser = useCallback(async () => {
    setIsLoading(true);
    try {
      await deleteUser(user.id);

      toast({
        variant: 'default',
        title: '계정 삭제',
        description: `${user.email} 계정이 삭제되었습니다.`,
      });

      onActionComplete?.('userDeleted', { userId: user.id });
      setIsConfirmDialogOpen(false);
      onClose?.();
    } catch (error) {
      console.error('계정 삭제 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: error.response?.data?.message || '계정 삭제에 실패했습니다.',
      });
    } finally {
      setIsLoading(false);
      setConfirmAction(null);
    }
  }, [user, toast, onActionComplete, onClose]);

  /**
   * 확인 다이얼로그 내용 렌더링
   */
  const renderConfirmDialog = () => {
    if (!confirmAction) return null;

    const configMap = {
      resetPassword: {
        title: '비밀번호 재설정',
        description: `${user.email}의 비밀번호를 재설정하시겠습니까?\n임시 비밀번호가 이메일로 발송됩니다.`,
        buttonLabel: '재설정',
        onConfirm: handleResetPassword,
        isDangerous: false,
      },
      toggleStatus: {
        title: `계정 ${user.isActive ? '비활성화' : '활성화'}`,
        description: `${user.email}의 계정을 ${user.isActive ? '비활성화' : '활성화'}하시겠습니까?`,
        buttonLabel: user.isActive ? '비활성화' : '활성화',
        onConfirm: handleToggleStatus,
        isDangerous: user.isActive,
      },
      deleteUser: {
        title: '계정 삭제',
        description: `${user.email}의 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
        buttonLabel: '삭제',
        onConfirm: handleDeleteUser,
        isDangerous: true,
      },
    };

    const config = configMap[confirmAction];
    if (!config) return null;

    return (
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent
          contentStyle={{
            zIndex: Z_INDEX.POPOVER + 20
          }}
          overlayStyle={{
            zIndex: Z_INDEX.POPOVER + 19
          }}
        >
          <DialogHeader>
            <DialogTitle>{config.title}</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {config.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmDialogOpen(false);
                setConfirmAction(null);
              }}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              variant={config.isDangerous ? 'destructive' : 'default'}
              onClick={config.onConfirm}
              disabled={isLoading}
            >
              {isLoading ? '처리 중...' : config.buttonLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (!user || !isSuperAdmin) {
    return null;
  }

  return (
    <>
      {/* 팝오버 메뉴 */}
      <div
        ref={contentRef}
        className="bg-white border rounded-lg shadow-lg p-1"
        style={{ zIndex: Z_INDEX.POPOVER }}
      >
        {/* 역할 변경 드롭다운 */}
        <div className="px-2 py-2">
          <div className="text-xs font-semibold text-gray-600 mb-2">역할 변경</div>
          <DropdownMenu open={isRoleMenuOpen} onOpenChange={setIsRoleMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between text-xs"
                disabled={isLoading}
              >
                <span>{roleOptions.find(r => r.value === user.role)?.label || user.role}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className="min-w-[120px]"
              style={{ zIndex: Z_INDEX.POPOVER + 10 }}
            >
              {roleOptions.map(role => (
                <DropdownMenuItem
                  key={role.value}
                  onSelect={(e) => {
                    e.preventDefault();
                    handleRoleChange(role.value);
                  }}
                  disabled={isLoading || role.value === user.role}
                  className={role.value === user.role ? 'font-bold text-blue-600' : ''}
                >
                  {role.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 계정 상태 변경 - 역할 변경 바로 아래 */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs gap-2 text-gray-700 hover:bg-gray-100"
          onClick={() => {
            setConfirmAction('toggleStatus');
            setIsConfirmDialogOpen(true);
          }}
          disabled={isLoading || !canToggleStatus}
        >
          <UserCheck className="h-4 w-4" />
          {user.isActive ? '계정 비활성화' : '계정 활성화'}
        </Button>

        <div className="border-t my-1"></div>

        {/* 비밀번호 재설정 */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs gap-2 text-gray-700 hover:bg-gray-100"
          onClick={() => {
            setConfirmAction('resetPassword');
            setIsConfirmDialogOpen(true);
          }}
          disabled={isLoading || !canResetPassword}
        >
          <Lock className="h-4 w-4" />
          비밀번호 재설정
        </Button>

        <div className="border-t my-1"></div>

        {/* 계정 삭제 */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs gap-2 text-red-600 hover:bg-red-50"
          onClick={() => {
            setConfirmAction('deleteUser');
            setIsConfirmDialogOpen(true);
          }}
          disabled={isLoading || !canDelete}
        >
          <Trash2 className="h-4 w-4" />
          계정 삭제
        </Button>
      </div>

      {/* 확인 다이얼로그 */}
      {renderConfirmDialog()}
    </>
  );
}

export default UserActionPopover;
