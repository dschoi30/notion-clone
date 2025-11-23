import React, { createContext, useContext, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as notificationApi from '@/services/notificationApi';
import { createLogger } from '@/lib/logger';
import { useErrorHandler } from '@/hooks/useErrorHandler';

const log = createLogger('NotificationContext');

const NotificationContext = createContext();

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

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
    onError: (e) => {
      log.error('알림 조회 실패', e);
      handleError(e, {
        customMessage: '알림 목록을 불러오지 못했습니다.',
        showToast: true
      });
    },
  });

  // 알림 수락 mutation
  const acceptMutation = useMutation({
    mutationFn: (id) => notificationApi.acceptNotification(id),
    onSuccess: () => {
      // 알림 목록 자동 리페칭
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => {
      log.error('알림 수락 실패', e);
      handleError(e, {
        customMessage: '알림 수락에 실패했습니다.',
        showToast: true
      });
    },
  });

  // 알림 거절 mutation
  const rejectMutation = useMutation({
    mutationFn: (id) => notificationApi.rejectNotification(id),
    onSuccess: () => {
      // 알림 목록 자동 리페칭
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => {
      log.error('알림 거절 실패', e);
      handleError(e, {
        customMessage: '알림 거절에 실패했습니다.',
        showToast: true
      });
    },
  });

  // 알림 읽음 처리 mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id) => notificationApi.markAsRead(id),
    onSuccess: () => {
      // 알림 목록 자동 리페칭
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => {
      log.error('알림 읽음 처리 실패', e);
      handleError(e, {
        customMessage: '알림 읽음 처리에 실패했습니다.',
        showToast: true
      });
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