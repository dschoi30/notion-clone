import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createLogger } from '@/lib/logger';

const ulog = createLogger('uiStore');

export const useUIStore = create(
  devtools(
    (set, get) => ({
      // 전역 UI 상태
      showShareModal: false,
      showVersionHistory: false,

      /**
       * 공유 모달 열기/닫기
       * @param {boolean} isOpen - 모달 열림 상태
       */
      setShowShareModal: (isOpen) => {
        set({ showShareModal: isOpen });
      },

      /**
       * 버전 기록 패널 열기/닫기
       * @param {boolean} isOpen - 패널 열림 상태
       */
      setShowVersionHistory: (isOpen) => {
        set({ showVersionHistory: isOpen });
      },
    }),
    { name: 'UIStore' }
  )
);

