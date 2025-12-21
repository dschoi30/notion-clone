import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createLogger } from '@/lib/logger';

const nlog = createLogger('notificationStore');

interface NotificationState {
  // 클라이언트 상태
  isNotificationModalOpen: boolean;
}

interface NotificationActions {
  /**
   * 알림 모달 열림 상태 설정
   * @param isOpen - 모달 열림 상태
   */
  setIsNotificationModalOpen: (isOpen: boolean) => void;
}

type NotificationStore = NotificationState & NotificationActions;

export const useNotificationStore = create<NotificationStore>()(
  devtools(
    (set) => ({
      // 클라이언트 상태
      isNotificationModalOpen: false,

      /**
       * 알림 모달 열림 상태 설정
       * @param isOpen - 모달 열림 상태
       */
      setIsNotificationModalOpen: (isOpen: boolean) => {
        set({ isNotificationModalOpen: isOpen });
      },
    }),
    { name: 'NotificationStore' }
  )
);

