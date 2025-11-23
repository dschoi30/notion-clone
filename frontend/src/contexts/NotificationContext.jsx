import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/stores/notificationStore';
import { useShallow } from 'zustand/react/shallow';
import * as notificationApi from '@/services/notificationApi';
import { createLogger } from '@/lib/logger';
import { useErrorHandler } from '@/hooks/useErrorHandler';

const log = createLogger('NotificationContext');

const NotificationContext = createContext();

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  
  // zustand store에서 클라이언트 상태 가져오기 (useShallow로 최적화)
  const {
    isNotificationModalOpen,
    setIsNotificationModalOpen
  } = useNotificationStore(
    useShallow((state) => ({
      isNotificationModalOpen: state.isNotificationModalOpen,
      setIsNotificationModalOpen: state.setIsNotificationModalOpen
    }))
  );

  // React Query로 알림 조회
  const {
    data: notifications = [],
    isLoading,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getNotifications(),
    staleTime: 1000 * 60 * 1, // 1분 - 알림은 자주 변경됨
    refetchInterval: isNotificationModalOpen ? 1000 * 60 * 5 : false, // 모달이 열려있을 때만 자동 리페칭
    refetchIntervalInBackground: false, // 백그라운드에서 리페칭하지 않음
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (notificationsError) {
      log.error('알림 조회 실패', notificationsError);
      handleError(notificationsError, {
        customMessage: '알림 목록을 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [notificationsError, handleError]);

  // 알림 수락 mutation (optimistic update)
  const acceptMutation = useMutation({
    mutationFn: (id) => notificationApi.acceptNotification(id),
    onMutate: async (id) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      
      // 이전 데이터 백업
      const previous = queryClient.getQueryData(['notifications']);
      
      // 낙관적 업데이트: 수락된 알림 제거
      queryClient.setQueryData(['notifications'], (old = []) =>
        old.filter(n => n.id !== id)
      );
      
      return { previous };
    },
    onError: (err, id, context) => {
      // 에러 시 이전 데이터로 복구
      if (context?.previous) {
        queryClient.setQueryData(['notifications'], context.previous);
      }
      log.error('알림 수락 실패', err);
      handleError(err, {
        customMessage: '알림 수락에 실패했습니다.',
        showToast: true
      });
    },
    onSettled: () => {
      // 최종적으로 서버 데이터와 동기화
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // 알림 거절 mutation (optimistic update)
  const rejectMutation = useMutation({
    mutationFn: (id) => notificationApi.rejectNotification(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData(['notifications']);
      
      queryClient.setQueryData(['notifications'], (old = []) =>
        old.filter(n => n.id !== id)
      );
      
      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications'], context.previous);
      }
      log.error('알림 거절 실패', err);
      handleError(err, {
        customMessage: '알림 거절에 실패했습니다.',
        showToast: true
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // 알림 읽음 처리 mutation (optimistic update)
  const markAsReadMutation = useMutation({
    mutationFn: (id) => notificationApi.markAsRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData(['notifications']);
      
      queryClient.setQueryData(['notifications'], (old = []) =>
        old.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      
      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications'], context.previous);
      }
      log.error('알림 읽음 처리 실패', err);
      handleError(err, {
        customMessage: '알림 읽음 처리에 실패했습니다.',
        showToast: true
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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