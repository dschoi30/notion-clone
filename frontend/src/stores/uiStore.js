import { create } from 'zustand';
import { createLogger } from '@/lib/logger';

const ulog = createLogger('uiStore');

export const useUIStore = create((set, get) => ({
  // 전역 UI 상태
  showShareModal: false,
  showVersionHistory: false,

  // 액션: 공유 모달 열기/닫기
  setShowShareModal: (isOpen) => {
    set({ showShareModal: isOpen });
  },

  // 액션: 버전 기록 패널 열기/닫기
  setShowVersionHistory: (isOpen) => {
    set({ showVersionHistory: isOpen });
  },
}));

