import { createContext, useContext, useCallback, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/stores/notificationStore';
import { useShallow } from 'zustand/react/shallow';
import * as notificationApi from '@/services/notificationApi';
import { createLogger } from '@/lib/logger';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import type { Notification } from '@/types';

const log = createLogger('NotificationContext');

interface NotificationContextType {
  notifications: Notification[];
  fetchNotifications: () => Promise<void>;
  acceptNotification: (id: number) => Promise<void>;
  rejectNotification: (id: number) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  isNotificationModalOpen: boolean;
  setIsNotificationModalOpen: (open: boolean) => void;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotification(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

interface MutationContext {
  previous: Notification[] | undefined;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
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
  } = useQuery<Notification[]>({
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
  const acceptMutation = useMutation<void, unknown, number, MutationContext>({
    mutationFn: (id: number) => notificationApi.acceptNotification(id),
    onMutate: async (id: number) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      
      // 이전 데이터 백업
      const previous = queryClient.getQueryData<Notification[]>(['notifications']);
      
      // 낙관적 업데이트: 수락된 알림 제거
      queryClient.setQueryData<Notification[]>(['notifications'], (old = []) =>
        old.filter(n => n.id !== id)
      );
      
      return { previous };
    },
    onError: (err: unknown, id: number, context: MutationContext | undefined) => {
      // 에러 시 이전 데이터로 복구
      if (context?.previous) {
        queryClient.setQueryData<Notification[]>(['notifications'], context.previous);
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
  const rejectMutation = useMutation<void, unknown, number, MutationContext>({
    mutationFn: (id: number) => notificationApi.rejectNotification(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData<Notification[]>(['notifications']);
      
      queryClient.setQueryData<Notification[]>(['notifications'], (old = []) =>
        old.filter(n => n.id !== id)
      );
      
      return { previous };
    },
    onError: (err: unknown, id: number, context: MutationContext | undefined) => {
      if (context?.previous) {
        queryClient.setQueryData<Notification[]>(['notifications'], context.previous);
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
  const markAsReadMutation = useMutation<void, unknown, number, MutationContext>({
    mutationFn: (id: number) => notificationApi.markAsRead(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData<Notification[]>(['notifications']);
      
      queryClient.setQueryData<Notification[]>(['notifications'], (old = []) =>
        old.map(n => n.id === id ? { ...n, status: 'READ' as const } : n)
      );
      
      return { previous };
    },
    onError: (err: unknown, id: number, context: MutationContext | undefined) => {
      if (context?.previous) {
        queryClient.setQueryData<Notification[]>(['notifications'], context.previous);
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

  const acceptNotification = useCallback(async (id: number) => {
    await acceptMutation.mutateAsync(id);
  }, [acceptMutation]);

  const rejectNotification = useCallback(async (id: number) => {
    await rejectMutation.mutateAsync(id);
  }, [rejectMutation]);

  const markAsRead = useCallback(async (id: number) => {
    await markAsReadMutation.mutateAsync(id);
  }, [markAsReadMutation]);

  const value: NotificationContextType = {
    notifications,
    fetchNotifications,
    acceptNotification,
    rejectNotification,
    markAsRead,
    isNotificationModalOpen,
    setIsNotificationModalOpen,
    isLoading,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

