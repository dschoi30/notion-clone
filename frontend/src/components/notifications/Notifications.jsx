import React from 'react';
import NotificationModal from './NotificationModal';
import { Bell } from 'lucide-react';
import { useNotification } from '@/contexts/NotificationContext';

export default function Notifications() {
  const { notifications, isNotificationModalOpen, setIsNotificationModalOpen, isLoading } = useNotification();
  
  // 미확인 알림 개수 계산 (로딩 완료 후에만 계산)
  const unreadCount = !isLoading ? notifications.filter(n => n.status === 'UNREAD').length : 0;

  return (
    <>
      <button
        className="flex items-center w-full px-4 py-2 border-gray-200"
        onClick={() => setIsNotificationModalOpen(true)}
      >
        <Bell className="w-5 h-5 mr-2" />
        <span>알림</span>
        {unreadCount > 0 && (
          <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      <NotificationModal 
        open={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
    </>
  );
} 