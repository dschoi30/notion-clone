// 시스템 속성 값 계산 공용 유틸

// 테이블 뷰(행: 자식 문서)용. 각 항목(row)의 document 메타데이터에서 값을 추출
export function buildSystemPropTypeMapForTable() {
  return {
    CREATED_BY: (row) => row?.document?.createdBy || '',
    LAST_UPDATED_BY: (row) => row?.document?.updatedBy || '',
    CREATED_AT: (row) => row?.document?.createdAt || '',
    LAST_UPDATED_AT: (row) => row?.document?.updatedAt || '',
  };
}

// 페이지 뷰(단일 문서)용. 현재 문서 메타데이터에서 값을 추출
export function buildSystemPropTypeMapForPage(document) {
  return {
    CREATED_BY: () => document?.createdBy || '',
    LAST_UPDATED_BY: () => document?.updatedBy || '',
    CREATED_AT: () => document?.createdAt || '',
    LAST_UPDATED_AT: () => document?.updatedAt || '',
  };
}


