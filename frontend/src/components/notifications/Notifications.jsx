import React from 'react';
import NotificationModal from './NotificationModal';
import { Bell } from 'lucide-react';
import { useNotification } from '@/contexts/NotificationContext';

export default function Notifications() {
  const { isNotificationModalOpen, setIsNotificationModalOpen } = useNotification();

  return (
    <>
      <button
        className="flex items-center w-full px-4 py-2 border-gray-200"
        onClick={() => setIsNotificationModalOpen(true)}
      >
        <Bell className="w-5 h-5 mr-2" />
        <span>알림</span>
      </button>
      {isNotificationModalOpen && <NotificationModal onClose={() => setIsNotificationModalOpen(false)} />}
    </>
  );
} 