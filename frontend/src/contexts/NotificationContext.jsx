import React, { createContext, useContext, useState, useCallback } from 'react';
import * as notificationApi from '@/services/notificationApi';

const NotificationContext = createContext();

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    const data = await notificationApi.getNotifications();
    setNotifications(data);
  }, []);

  const acceptNotification = useCallback(async (id) => {
    await notificationApi.acceptNotification(id);
    fetchNotifications();
  }, [fetchNotifications]);

  const rejectNotification = useCallback(async (id) => {
    await notificationApi.rejectNotification(id);
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      fetchNotifications,
      acceptNotification,
      rejectNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  );
} 