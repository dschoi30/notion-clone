import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNotification } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/constants/zIndex';
import { cn } from '@/lib/utils';
import UserBadge from '@/components/documents/shared/UserBadge';
import { Tooltip } from '@/components/ui/tooltip';
import { Check } from 'lucide-react';

export default function NotificationModal({ open, onClose }) {
  const { notifications, fetchNotifications, acceptNotification, rejectNotification, markAsRead } = useNotification();
  const [dialogPosition, setDialogPosition] = React.useState({ left: 0, top: 0, position: 'fixed' });
  const [hoveredNotificationId, setHoveredNotificationId] = useState(null);

  // 메시지에서 사용자 이름 추출 (예: "게스트1님이..." -> "게스트1")
  const extractUserName = (message) => {
    const match = message.match(/^([^님이]+)님/);
    return match ? match[1] : null;
  };

  // 날짜를 한글 형식으로 변환 (#월 #일)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
  };

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  // 위치 계산 함수 - 사이드바 오른쪽에 붙여서 전체 높이 패널
  function calculateDialogPosition() {
    // 사이드바 너비는 w-64 (256px)
    const sidebarWidth = 256;
    return {
      left: sidebarWidth,
      top: 0,
      position: 'fixed',
    };
  }

  // 위치 계산 (open 변경 시)
  useLayoutEffect(() => {
    if (!open) return;
    const pos = calculateDialogPosition();
    if (pos) {
      setDialogPosition(pos);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        overlay={false}
        noDefaultStyle={true}
        style={{
          position: dialogPosition.position,
          left: dialogPosition.left,
          top: dialogPosition.top,
          height: '100vh',
          width: '400px',
          margin: 0,
          transform: 'none',
          zIndex: Z_INDEX.NOTIFICATION_MODAL,
          transformOrigin: 'left center',
        }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn(
          "flex flex-col bg-white border-r border-gray-200 shadow-xl transition-none",
          open ? "animate-trash-dialog-in" : "animate-trash-dialog-out"
        )}
      >
        <DialogHeader className="px-4 py-3 border-b border-gray-200">
          <DialogTitle className="text-sm text-gray-900 font-normal">알림</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">알림이 없습니다.</div>
          ) : (
            <ul className="space-y-0">
              {notifications.map(n => {
                const isUnread = n.status === 'UNREAD';
                const userName = extractUserName(n.message);
                const isHovered = hoveredNotificationId === n.id;
                
                return (
                  <li 
                    key={n.id} 
                    className={cn(
                      "flex flex-col px-6 py-4 border-b relative group",
                      isUnread 
                        ? 'bg-blue-50 border-b border-gray-200' 
                        : 'bg-white border-b border-gray-100'
                    )}
                    onMouseEnter={() => setHoveredNotificationId(n.id)}
                    onMouseLeave={() => setHoveredNotificationId(null)}
                  >
                    <div className="flex items-start gap-3">
                      {/* UserBadge */}
                      {userName && (
                        <div className="flex-shrink-0">
                          <UserBadge 
                            name={userName}
                            size={32}
                            showLabel={false}
                          />
                        </div>
                      )}
                      
                      {/* 메시지와 날짜 */}
                      <div className="flex-1 min-w-0 flex items-center">
                        <div className="flex items-start justify-between gap-2 w-full">
                          <div className="flex-1 min-w-0 flex items-start pt-1">
                            <span className={cn(
                              "inline leading-normal",
                              isUnread ? 'font-semibold text-gray-900' : 'font-normal text-gray-600'
                            )}>
                              {n.message}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 pt-2">
                            {/* 날짜 */}
                            <span className="text-xs text-gray-500 whitespace-nowrap leading-normal">
                              {formatDate(n.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 읽음 처리 아이콘 (호버 시 표시, absolute positioning) */}
                    {isUnread && isHovered && (
                      <Tooltip content="읽음으로 표시" side="top">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-gray-200 transition-colors bg-white shadow-sm border border-gray-200 z-10"
                          style={{ zIndex: 20 }}
                        >
                          <Check className="w-4 h-4 text-gray-600" />
                        </button>
                      </Tooltip>
                    )}
                    
                    {n.type === 'INVITE' && n.status === 'UNREAD' && (
                      <div className="flex gap-2 mt-3 ml-11">
                        <Button size="sm" onClick={() => acceptNotification(n.id)}>수락</Button>
                        <Button size="sm" variant="outline" onClick={() => rejectNotification(n.id)}>거절</Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 