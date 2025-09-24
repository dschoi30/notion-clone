/**
 * Z-Index 관리 상수
 * 
 * 레이어 우선순위 (낮은 값 → 높은 값):
 * - 기본 레이어: 1000-1030
 * - 모달 관련: 1040-1050  
 * - 팝오버/툴팁: 1060-1070
 * - 알림: 1080
 * - 특수 모달: 1090-1120
 */

export const Z_INDEX = {
  // === 기본 레이어 ===
  /** 드롭다운 메뉴 */
  DROPDOWN: 1000,
  
  /** sticky 요소 (테이블 헤더 등) */
  STICKY: 1020,
  
  /** fixed 요소 (DocumentHeader 등) */
  FIXED: 1030,
  
  /** fixed 요소 (Sidebar 등) */
  SIDEBAR: 1035,

  // === 모달 관련 ===
  /** 모달 배경 오버레이 */
  MODAL_BACKDROP: 1040,
  
  /** 일반 모달 */
  MODAL: 1050,
  
  // === 팝오버/툴팁 ===
  /** 팝오버 (공유 팝오버, 필터 팝오버 등) */
  POPOVER: 1060,
  
  /** 툴팁 */
  TOOLTIP: 1070,
  
  // === 알림 ===
  /** 토스트 알림 */
  TOAST: 1080,
  
  // === 특수 모달 (높은 우선순위) ===
  /** 검색 모달 */
  SEARCH_MODAL: 1050,
  
  /** 알림 모달 */
  NOTIFICATION_MODAL: 1100,
  
  /** 설정 패널 */
  SETTINGS_PANEL: 1110,
  
  /** 버전 기록 패널 */
  VERSION_HISTORY: 1120,
  
  // === 테이블 관련 ===
  /** 테이블 툴바 (모달 열림 시 낮은 z-index) */
  TABLE_TOOLBAR: 10,
  
  /** 테이블 툴바 (모달 닫힘 시 높은 z-index) */
  TABLE_TOOLBAR_ACTIVE: 20,
  
  /** 테이블 헤더 */
  TABLE_HEADER: 10,
};

/**
 * Z-Index 유틸리티 함수들
 */
export const ZIndexUtils = {
  /**
   * 모달이 열려있을 때 테이블 툴바의 z-index를 반환
   * @param {boolean} isModalOpen - 모달이 열려있는지 여부
   * @returns {number} 적절한 z-index 값
   */
  getTableToolbarZIndex: (isModalOpen) => {
    return isModalOpen ? Z_INDEX.TABLE_TOOLBAR : Z_INDEX.TABLE_TOOLBAR_ACTIVE;
  },
  
  /**
   * 모달이 열려있을 때 DocumentHeader의 배경색을 반환
   * @param {boolean} isModalOpen - 모달이 열려있는지 여부
   * @returns {string} CSS 클래스명
   */
  getDocumentHeaderBackground: (isModalOpen) => {
    return isModalOpen ? '' : 'bg-white backdrop-blur-sm';
  },
};

export default Z_INDEX;
