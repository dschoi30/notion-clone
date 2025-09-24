import React, { useEffect } from 'react';
import { useNotification } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/constants/zIndex';

export default function NotificationModal({ onClose }) {
  const { notifications, fetchNotifications, acceptNotification, rejectNotification } = useNotification();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30"
      style={{ zIndex: Z_INDEX.NOTIFICATION_MODAL }}
    >
      <div className="p-6 bg-white rounded shadow-lg w-96">
        <h2 className="mb-4 text-lg font-semibold">알림</h2>
        {notifications.length === 0 ? (
          <div className="text-center text-gray-500">알림이 없습니다.</div>
        ) : (
          <ul className="space-y-4">
            {notifications.map(n => (
              <li key={n.id} className="flex flex-col pb-2 border-b">
                <div>
                  <span className="font-medium">{n.message}</span>
                  <span className="ml-2 text-sm text-gray-500">({n.type})</span>
                </div>
                {n.type === 'INVITE' && n.status === 'UNREAD' && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => acceptNotification(n.id)}>수락</Button>
                    <Button size="sm" variant="outline" onClick={() => rejectNotification(n.id)}>거절</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>닫기</Button>
        </div>
      </div>
    </div>
  );
} 