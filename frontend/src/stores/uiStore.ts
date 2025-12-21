import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createLogger } from '@/lib/logger';

const ulog = createLogger('uiStore');

interface UIState {
  // 전역 UI 상태
  showShareModal: boolean;
  showVersionHistory: boolean;
}

interface UIActions {
  /**
   * 공유 모달 열기/닫기
   * @param isOpen - 모달 열림 상태
   */
  setShowShareModal: (isOpen: boolean) => void;

  /**
   * 버전 기록 패널 열기/닫기
   * @param isOpen - 패널 열림 상태
   */
  setShowVersionHistory: (isOpen: boolean) => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      // 전역 UI 상태
      showShareModal: false,
      showVersionHistory: false,

      /**
       * 공유 모달 열기/닫기
       * @param isOpen - 모달 열림 상태
       */
      setShowShareModal: (isOpen: boolean) => {
        set({ showShareModal: isOpen });
      },

      /**
       * 버전 기록 패널 열기/닫기
       * @param isOpen - 패널 열림 상태
       */
      setShowVersionHistory: (isOpen: boolean) => {
        set({ showVersionHistory: isOpen });
      },
    }),
    { name: 'UIStore' }
  )
);

