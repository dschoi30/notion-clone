import { create } from 'zustand';
import { createLogger } from '@/lib/logger';

const rlog = createLogger('notificationStore');

export const useNotificationStore = create((set, get) => ({
  // 클라이언트 상태
  isNotificationModalOpen: false,

  // 액션: 알림 모달 열림 상태 설정
  setIsNotificationModalOpen: (isOpen) => {
    set({ isNotificationModalOpen: isOpen });
  },
}));

