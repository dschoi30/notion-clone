import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as notificationApi from '@/services/notificationApi';

const NotificationContext = createContext();

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await notificationApi.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('알림 조회 실패:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 마운트 시 알림 자동 로딩
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const acceptNotification = useCallback(async (id) => {
    await notificationApi.acceptNotification(id);
    fetchNotifications();
  }, [fetchNotifications]);

  const rejectNotification = useCallback(async (id) => {
    await notificationApi.rejectNotification(id);
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    await notificationApi.markAsRead(id);
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      fetchNotifications,
      acceptNotification,
      rejectNotification,
      markAsRead,
      isNotificationModalOpen,
      setIsNotificationModalOpen,
      isLoading,
    }}>
      {children}
    </NotificationContext.Provider>
  );
} 