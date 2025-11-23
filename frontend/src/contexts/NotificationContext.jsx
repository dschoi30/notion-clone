import React, { createContext, useContext, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as notificationApi from '@/services/notificationApi';
import { createLogger } from '@/lib/logger';

const log = createLogger('NotificationContext');

const NotificationContext = createContext();

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // React Query로 알림 조회
  const {
    data: notifications = [],
    isLoading,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getNotifications(),
    staleTime: 1000 * 60 * 1, // 1분 - 알림은 자주 변경됨
    refetchInterval: 1000 * 60 * 5, // 5분마다 자동 리페칭
  });

  // 알림 수락 mutation
  const acceptMutation = useMutation({
    mutationFn: (id) => notificationApi.acceptNotification(id),
    onSuccess: () => {
      // 알림 목록 자동 리페칭
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      log.error('acceptNotification 에러', error);
    },
  });

  // 알림 거절 mutation
  const rejectMutation = useMutation({
    mutationFn: (id) => notificationApi.rejectNotification(id),
    onSuccess: () => {
      // 알림 목록 자동 리페칭
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      log.error('rejectNotification 에러', error);
    },
  });

  // 알림 읽음 처리 mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id) => notificationApi.markAsRead(id),
    onSuccess: () => {
      // 알림 목록 자동 리페칭
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      log.error('markAsRead 에러', error);
    },
  });

  // 기존 API와 호환성을 위한 래퍼 함수
  const fetchNotifications = useCallback(async () => {
    await refetchNotifications();
  }, [refetchNotifications]);

  const acceptNotification = useCallback(async (id) => {
    await acceptMutation.mutateAsync(id);
  }, [acceptMutation]);

  const rejectNotification = useCallback(async (id) => {
    await rejectMutation.mutateAsync(id);
  }, [rejectMutation]);

  const markAsRead = useCallback(async (id) => {
    await markAsReadMutation.mutateAsync(id);
  }, [markAsReadMutation]);

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