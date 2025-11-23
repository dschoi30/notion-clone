# Zustand 마이그레이션 계획

## 개요
현재 부분적으로 도입된 zustand를 프로젝트 전체에 확대 적용하여 클라이언트 상태 관리를 통일하고, Context API의 복잡성을 줄이며 성능을 개선합니다.

## 현재 상태 분석

### Context API로 관리되는 상태
1. **AuthContext**
   - `user`: 현재 로그인한 사용자 정보
   - `loading`: 로딩 상태
   - `error`: 에러 상태
   - `login`, `register`, `loginWithGoogle`, `logout`, `updateUser`: 액션 함수들

2. **WorkspaceContext**
   - `currentWorkspace`: 현재 선택된 워크스페이스
   - `isSettingsPanelOpen`: 설정 패널 열림 상태
   - `isSearchModalOpen`: 검색 모달 열림 상태
   - `workspaces`: 워크스페이스 목록 (React Query로 관리)
   - `selectWorkspace`, `createWorkspace`, `updateWorkspace`, `deleteWorkspace`: 액션 함수들

3. **DocumentContext**
   - `currentDocument`: 현재 선택된 문서
   - `documentLoading`: 문서 로딩 상태
   - `documents`: 문서 목록 (React Query로 관리)
   - `selectDocument`, `fetchDocument`, `createDocument`, `updateDocument`, `deleteDocument`: 액션 함수들

4. **NotificationContext**
   - `isNotificationModalOpen`: 알림 모달 열림 상태
   - `notifications`: 알림 목록 (React Query로 관리)
   - `acceptNotification`, `rejectNotification`, `markAsRead`: 액션 함수들

### 이미 zustand로 관리되는 상태
- **useDocumentPropertiesStore**: 문서 속성, titleWidth, documentId

### 로컬 useState로 관리되는 상태
- `useTableSort`: 테이블 정렬 상태 (로컬스토리지 연동)
- `DocumentEditor`: title, content, saveStatus, showShareModal 등
- 기타 컴포넌트들의 UI 상태들

## 마이그레이션 전략

### 원칙
1. **React Query는 유지**: 서버 상태(데이터 페칭)는 React Query로 유지
2. **클라이언트 상태만 zustand로**: UI 상태, 선택 상태, 모달 상태 등은 zustand로 이동
3. **점진적 마이그레이션**: Phase별로 단계적으로 진행하여 안정성 확보
4. **기존 API 호환성 유지**: 기존 hook 인터페이스는 유지하여 컴포넌트 수정 최소화

## Phase별 작업 계획

### Phase 1: AuthStore 마이그레이션
**목표**: AuthContext를 zustand store로 전환

**작업 내용**:
- `stores/authStore.js` 생성
  - `user`, `loading`, `error` 상태
  - `login`, `register`, `loginWithGoogle`, `logout`, `updateUser` 액션
  - localStorage 동기화 (persist 미들웨어 사용)
  - authSync 이벤트 처리
- `AuthContext.jsx`를 zustand store를 사용하는 래퍼로 변경
- 모든 `useAuth()` 호출부는 그대로 유지 (호환성 유지)

**예상 소요 시간**: 2-3시간

**커밋 메시지**: `feat: Phase 1 - AuthContext를 zustand store로 마이그레이션`

---

### Phase 2: WorkspaceStore 마이그레이션
**목표**: WorkspaceContext의 클라이언트 상태를 zustand store로 전환

**작업 내용**:
- `stores/workspaceStore.js` 생성
  - `currentWorkspace`: 현재 선택된 워크스페이스
  - `isSettingsPanelOpen`: 설정 패널 상태
  - `isSearchModalOpen`: 검색 모달 상태
  - `selectWorkspace`, `setSettingsPanelOpen`, `setSearchModalOpen` 액션
  - localStorage 동기화 (selectedWorkspace)
- `WorkspaceContext.jsx`는 React Query 데이터만 제공하도록 변경
- `useWorkspace()` hook은 zustand store와 React Query를 조합하여 제공

**예상 소요 시간**: 2-3시간

**커밋 메시지**: `feat: Phase 2 - WorkspaceContext 클라이언트 상태를 zustand store로 마이그레이션`

---

### Phase 3: DocumentStore 마이그레이션
**목표**: DocumentContext의 클라이언트 상태를 zustand store로 전환

**작업 내용**:
- `stores/documentStore.js` 생성
  - `currentDocument`: 현재 선택된 문서
  - `documentLoading`: 문서 로딩 상태
  - `selectDocument`, `setCurrentDocument`, `setDocumentLoading` 액션
  - localStorage 동기화 (lastDocumentId)
- `DocumentContext.jsx`는 React Query 데이터만 제공하도록 변경
- `useDocument()` hook은 zustand store와 React Query를 조합하여 제공

**예상 소요 시간**: 3-4시간

**커밋 메시지**: `feat: Phase 3 - DocumentContext 클라이언트 상태를 zustand store로 마이그레이션`

---

### Phase 4: NotificationStore 및 UI 상태 마이그레이션
**목표**: NotificationContext의 UI 상태와 기타 컴포넌트의 UI 상태를 zustand로 통합

**작업 내용**:
- `stores/notificationStore.js` 생성
  - `isNotificationModalOpen`: 알림 모달 상태
  - `setNotificationModalOpen` 액션
- `stores/uiStore.js` 생성 (선택적)
  - 전역 UI 상태 통합 (모달, 사이드바 등)
  - `showShareModal`, `showVersionHistory` 등
- `NotificationContext.jsx`는 React Query 데이터만 제공하도록 변경

**예상 소요 시간**: 2-3시간

**커밋 메시지**: `feat: Phase 4 - NotificationContext 및 UI 상태를 zustand store로 마이그레이션`

---

### Phase 5: 기타 로컬 상태 통합 및 정리
**목표**: 컴포넌트별 로컬 상태를 zustand로 통합 가능한 것들 정리

**작업 내용**:
- `useTableSort`의 상태를 zustand로 이동 (선택적)
- `DocumentEditor`의 일부 상태를 zustand로 이동 (선택적)
- 불필요한 Context Provider 제거
- 코드 정리 및 문서화

**예상 소요 시간**: 2-3시간

**커밋 메시지**: `feat: Phase 5 - 기타 로컬 상태 zustand 통합 및 정리`

---

## 기술적 고려사항

### zustand persist 미들웨어
- localStorage 동기화가 필요한 상태에 적용
- `user`, `currentWorkspace`, `currentDocument` 등

### React Query와의 통합
- 서버 상태는 React Query로 유지
- zustand는 클라이언트 상태만 관리
- 두 시스템이 자연스럽게 협력하도록 설계

### 기존 API 호환성
- 기존 hook 인터페이스(`useAuth()`, `useWorkspace()` 등)는 유지
- 내부 구현만 zustand로 변경하여 컴포넌트 수정 최소화

### 성능 최적화
- zustand의 selector 기능 활용하여 불필요한 리렌더링 방지
- `shallow` 비교를 통한 최적화

## 예상 효과

### 코드 품질
- Context Provider 중첩 감소
- 상태 관리 로직의 명확성 향상
- 코드 중복 제거

### 성능
- 불필요한 리렌더링 감소 (selector 활용)
- Context Provider 체인 단순화

### 개발 경험
- 상태 관리 패턴 통일
- 디버깅 용이성 향상 (zustand devtools)
- 타입 안전성 향상

## 리스크 및 대응 방안

### 리스크
1. **기존 기능 동작 오류**: 마이그레이션 과정에서 기존 기능이 깨질 수 있음
2. **상태 동기화 문제**: localStorage와 상태 동기화 이슈
3. **의존성 문제**: Context 간 의존성으로 인한 순환 참조

### 대응 방안
1. Phase별로 충분한 테스트 진행
2. 각 Phase 완료 후 커밋하여 롤백 가능하도록
3. 기존 Context를 완전히 제거하지 않고 점진적으로 교체

## 진행 상황 추적

- [ ] Phase 1: AuthStore 마이그레이션
- [ ] Phase 2: WorkspaceStore 마이그레이션
- [ ] Phase 3: DocumentStore 마이그레이션
- [ ] Phase 4: NotificationStore 및 UI 상태 마이그레이션
- [ ] Phase 5: 기타 로컬 상태 통합 및 정리

---

**작성일**: 2025-11-23  
**작성자**: AI Assistant  
**버전**: 1.0

