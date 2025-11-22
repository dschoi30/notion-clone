import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/useToast';
import {
  updateUserRole,
  resetUserPassword,
  toggleUserStatus,
  deleteUser,
} from '@/services/userApi';
import { ChevronDown, Lock, Trash2, UserCheck } from 'lucide-react';
import { Z_INDEX } from '@/constants/zIndex';

/**
 * 여러 사용자에 대한 일괄 작업 팝오버
 */
function BulkUserActionPopover({
  selectedUserIds,
  selectedUsers = [],
  isAllSelected = false,
  onActionComplete,
  currentUserRole,
  anchorRef,
  onClose
}) {
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'resetPassword' | 'toggleStatus' | 'delete'
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const contentRef = useRef(null);

  // SUPER_ADMIN만 이 기능을 사용할 수 있음
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN';

  // 외부 클릭 감지하여 팝오버 닫기
  useEffect(() => {
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
  }, [isConfirmDialogOpen, isRoleMenuOpen, anchorRef, onClose]);

  // 역할 옵션
  const roleOptions = [
    { value: 'SUPER_ADMIN', label: '슈퍼 관리자' },
    { value: 'ADMIN', label: '관리자' },
    { value: 'USER', label: '사용자' },
  ];

  /**
   * 일괄 역할 변경
   */
  const handleBulkRoleChange = useCallback(async (newRole) => {
    setIsLoading(true);
    try {
      const userIds = Array.from(selectedUserIds);
      let successCount = 0;
      let failCount = 0;

      // 각 사용자의 역할을 순차적으로 변경
      for (const userId of userIds) {
        try {
          await updateUserRole(userId, newRole);
          successCount++;
        } catch (error) {
          console.error(`사용자 ${userId} 역할 변경 실패:`, error);
          failCount++;
        }
      }

      toast({
        variant: 'default',
        title: '역할 변경 완료',
        description: `${successCount}명 변경됨${failCount > 0 ? `, ${failCount}명 실패` : ''}`,
      });

      onActionComplete?.('bulkRoleChanged', { count: successCount });
      setIsRoleMenuOpen(false);
    } catch (error) {
      console.error('일괄 역할 변경 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: error.response?.data?.message || '역할 변경에 실패했습니다.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedUserIds, toast, onActionComplete]);

  /**
   * 일괄 계정 잠금/잠금 해제
   */
  const handleBulkToggleStatus = useCallback(async (isActive) => {
    setIsLoading(true);
    try {
      const userIds = Array.from(selectedUserIds);
      let successCount = 0;
      let failCount = 0;

      // 각 사용자의 상태를 순차적으로 변경
      for (const userId of userIds) {
        try {
          await toggleUserStatus(userId, isActive);
          successCount++;
        } catch (error) {
          console.error(`사용자 ${userId} 상태 변경 실패:`, error);
          failCount++;
        }
      }

      toast({
        variant: 'default',
        title: '상태 변경 완료',
        description: `${successCount}명 ${isActive ? '잠금 해제' : '잠금'}됨${failCount > 0 ? `, ${failCount}명 실패` : ''}`,
      });

      onActionComplete?.('bulkStatusChanged', { count: successCount });
      setIsConfirmDialogOpen(false);
    } catch (error) {
      console.error('일괄 상태 변경 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: error.response?.data?.message || '상태 변경에 실패했습니다.',
      });
    } finally {
      setIsLoading(false);
      setConfirmAction(null);
    }
  }, [selectedUserIds, toast, onActionComplete]);

  /**
   * 일괄 비밀번호 재설정
   */
  const handleBulkResetPassword = useCallback(async () => {
    setIsLoading(true);
    try {
      const userIds = Array.from(selectedUserIds);
      let successCount = 0;
      let failCount = 0;

      // 각 사용자의 비밀번호를 순차적으로 재설정
      for (const userId of userIds) {
        try {
          await resetUserPassword(userId);
          successCount++;
        } catch (error) {
          console.error(`사용자 ${userId} 비밀번호 재설정 실패:`, error);
          failCount++;
        }
      }

      toast({
        variant: 'default',
        title: '비밀번호 재설정 완료',
        description: `${successCount}명 처리됨${failCount > 0 ? `, ${failCount}명 실패` : ''}`,
      });

      onActionComplete?.('bulkPasswordReset', { count: successCount });
      setIsConfirmDialogOpen(false);
    } catch (error) {
      console.error('일괄 비밀번호 재설정 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: error.response?.data?.message || '비밀번호 재설정에 실패했습니다.',
      });
    } finally {
      setIsLoading(false);
      setConfirmAction(null);
    }
  }, [selectedUserIds, toast, onActionComplete]);

  /**
   * 일괄 계정 삭제
   */
  const handleBulkDelete = useCallback(async () => {
    setIsLoading(true);
    try {
      const userIds = Array.from(selectedUserIds);
      let successCount = 0;
      let failCount = 0;

      for (const userId of userIds) {
        try {
          await deleteUser(userId);
          successCount++;
        } catch (error) {
          console.error(`사용자 ${userId} 삭제 실패:`, error);
          failCount++;
        }
      }

      toast({
        variant: 'default',
        title: '삭제 완료',
        description: `${successCount}명 삭제됨${failCount > 0 ? `, ${failCount}명 실패` : ''}`,
      });

      onActionComplete?.('bulkDelete', { count: successCount });
      setIsConfirmDialogOpen(false);
    } catch (error) {
      console.error('일괄 삭제 실패:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: error.response?.data?.message || '삭제에 실패했습니다.',
      });
    } finally {
      setIsLoading(false);
      setConfirmAction(null);
    }
  }, [selectedUserIds, toast, onActionComplete]);

  // 조건 확인: 선택된 사용자가 없거나 SUPER_ADMIN이 아니면 렌더링하지 않음
  if (!selectedUserIds || selectedUserIds.size === 0 || !isSuperAdmin) {
    return null;
  }

  return (
    <>
      {/* 팝오버 메뉴 */}
      <div ref={contentRef} className="bg-white border rounded-lg shadow-lg p-2" style={{ minWidth: '200px' }}>
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
                <span>역할 선택</span>
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
                    handleBulkRoleChange(role.value);
                  }}
                  disabled={isLoading}
                >
                  {role.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 계정 잠금/잠금 해제 - 역할 변경 바로 아래 */}
        {/* 전체 선택 시에는 계정 잠금/잠금 해제 버튼 숨김 */}
        {!isAllSelected && (
          selectedUserIds.size === 1 && selectedUsers.length > 0 ? (
            // 한 명만 선택했을 때: 해당 사용자의 상태에 따라 버튼 텍스트 변경
            (() => {
              const selectedUser = selectedUsers[0];
              const isActive = selectedUser.isActive !== undefined ? selectedUser.isActive : true;
              return (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs gap-2 text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    setConfirmAction('toggleStatus');
                    setIsConfirmDialogOpen(true);
                  }}
                  disabled={isLoading}
                >
                  <UserCheck className="h-4 w-4" />
                  {isActive ? '계정 잠금' : '계정 잠금 해제'}
                </Button>
              );
            })()
          ) : (
            // 여러 명 선택했을 때: 일반 텍스트
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs gap-2 text-gray-700 hover:bg-gray-100"
              onClick={() => {
                setConfirmAction('toggleStatus');
                setIsConfirmDialogOpen(true);
              }}
              disabled={isLoading}
            >
              <UserCheck className="h-4 w-4" />
              계정 잠금/잠금 해제
            </Button>
          )
        )}

        <div className="border-t my-1"></div>

        {/* 비밀번호 재설정 - 한 명만 선택했을 때만 표시 */}
        {selectedUserIds.size === 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs gap-2 text-gray-700 hover:bg-gray-100"
            onClick={() => {
              setConfirmAction('resetPassword');
              setIsConfirmDialogOpen(true);
            }}
            disabled={isLoading}
          >
            <Lock className="h-4 w-4" />
            비밀번호 재설정
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs gap-2 text-red-600 hover:bg-red-50"
          onClick={() => {
            setConfirmAction('delete');
            setIsConfirmDialogOpen(true);
          }}
          disabled={isLoading}
        >
          <Trash2 className="h-4 w-4" />
          계정 삭제
        </Button>
      </div>

      {/* 확인 다이얼로그 */}
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
            <DialogTitle>
              {confirmAction === 'resetPassword'
                ? '비밀번호 재설정'
                : confirmAction === 'delete'
                ? '계정 삭제'
                : '계정 상태 변경'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'resetPassword' ? (
                <>
                  사용자 비밀번호를 재설정하시겠습니까?
                  임시 비밀번호가 이메일로 발송됩니다.
                </>
              ) : confirmAction === 'delete' ? (
                <>
                  선택한 {selectedUserIds.size}명의 사용자 계정을 삭제하시겠습니까?
                  이 작업은 되돌릴 수 없습니다.
                </>
              ) : (
                <>
                  선택한 {selectedUserIds.size}명의 사용자 계정을 잠금 또는 잠금 해제하시겠습니까?
                </>
              )}
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
            {confirmAction === 'resetPassword' ? (
              <Button
                onClick={handleBulkResetPassword}
                disabled={isLoading}
              >
                {isLoading ? '처리 중...' : '재설정'}
              </Button>
            ) : confirmAction === 'delete' ? (
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isLoading}
              >
                {isLoading ? '처리 중...' : '삭제'}
              </Button>
            ) : (
              // 한 명만 선택했을 때: 해당 사용자의 상태에 따라 버튼 하나만 표시
              selectedUserIds.size === 1 && selectedUsers.length > 0 ? (
                (() => {
                  const selectedUser = selectedUsers[0];
                  const isActive = selectedUser.isActive !== undefined ? selectedUser.isActive : true;
                  return (
                    <Button
                      variant={isActive ? 'destructive' : 'default'}
                      onClick={() => {
                        handleBulkToggleStatus(!isActive);
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? '처리 중...' : isActive ? '계정 잠금' : '계정 잠금 해제'}
                    </Button>
                  );
                })()
              ) : (
                // 여러 명 선택했을 때: 잠금 해제/잠금 버튼 둘 다 표시
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleBulkToggleStatus(true);
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? '처리 중...' : '잠금 해제'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleBulkToggleStatus(false);
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? '처리 중...' : '잠금'}
                  </Button>
                </>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BulkUserActionPopover;
