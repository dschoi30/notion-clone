import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createLogger } from '@/lib/logger';

const rlog = createLogger('notificationStore');

export const useNotificationStore = create(
  devtools(
    (set, get) => ({
      // 클라이언트 상태
      isNotificationModalOpen: false,

      /**
       * 알림 모달 열림 상태 설정
       * @param {boolean} isOpen - 모달 열림 상태
       */
      setIsNotificationModalOpen: (isOpen) => {
        set({ isNotificationModalOpen: isOpen });
      },
    }),
    { name: 'NotificationStore' }
  )
);

