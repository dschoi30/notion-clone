# TypeScript 마이그레이션 우선순위 가이드

## 현재 상태
- **총 남은 파일**: 약 89개 (JS/JSX)
- **완료된 작업**: Phase 1-4 (환경 설정, 타입 정의, 유틸리티, 서비스, 훅, 컨텍스트, UI 컴포넌트)

## 마이그레이션 우선순위 전략

### 원칙
1. **의존성 하향식**: 다른 파일에서 많이 사용되는 파일부터 변환
2. **복잡도 증가**: 간단한 파일 → 복잡한 파일
3. **도메인별 그룹화**: 관련 파일들을 함께 변환하여 일관성 유지

---

## Phase 6: 스토어 및 핵심 훅 (최우선)

### 6.1 Zustand 스토어 (5개)
**우선순위: 매우 높음** - 모든 컴포넌트에서 사용

1. `stores/uiStore.js` → `uiStore.ts` ⭐ (가장 간단)
2. `stores/notificationStore.js` → `notificationStore.ts`
3. `stores/workspaceStore.js` → `workspaceStore.ts`
4. `stores/authStore.js` → `authStore.ts`
5. `stores/documentStore.js` → `documentStore.ts` ⭐ (가장 복잡)

**이유**: 스토어는 전역 상태 관리의 핵심이며, 타입 안정성이 가장 중요합니다.

### 6.2 핵심 커스텀 훅 (7개)
**우선순위: 높음** - 여러 컴포넌트에서 재사용

1. `hooks/useWorkspacePermissions.js` → `useWorkspacePermissions.ts`
2. `hooks/useTrash.js` → `useTrash.ts`
3. `hooks/usePageStayTimer.js` → `usePageStayTimer.ts`
4. `hooks/useDocumentPresence.js` → `useDocumentPresence.ts`
5. `hooks/useDocumentPropertiesStore.js` → `useDocumentPropertiesStore.ts`
6. `hooks/useDocumentSocket.js` → `useDocumentSocket.ts` ⭐ (WebSocket, 복잡)
7. `hooks/useDocumentPresence.js` → `useDocumentPresence.ts`

**이유**: 훅은 여러 컴포넌트에서 사용되므로 타입 안정성이 중요합니다.

---

## Phase 7: 유틸리티 및 상수

### 7.1 상수 파일 (1개)
1. `constants/zIndex.js` → `zIndex.ts`

### 7.2 문서 관련 유틸리티 (4개)
1. `components/documents/shared/constants.js` → `constants.ts`
2. `components/documents/shared/resolveUserDisplay.js` → `resolveUserDisplay.ts`
3. `components/documents/shared/systemPropTypeMap.js` → `systemPropTypeMap.ts`
4. `components/documents/shared/hooks/usePropertiesDnd.js` → `usePropertiesDnd.ts`

**이유**: 유틸리티는 타입 안정성이 중요하며, 변환이 비교적 간단합니다.

---

## Phase 8: 엔트리 포인트 및 레이아웃

### 8.1 엔트리 포인트 (2개)
1. `main.jsx` → `main.tsx`
2. `App.jsx` → `App.tsx`

### 8.2 레이아웃 컴포넌트 (11개)
**우선순위: 중간** - 앱 구조의 기반

1. `components/layout/AppRouter.jsx` → `AppRouter.tsx`
2. `components/layout/AuthRouter.jsx` → `AuthRouter.tsx`
3. `components/layout/MainLayout.jsx` → `MainLayout.tsx`
4. `components/layout/Sidebar.jsx` → `Sidebar.tsx`
5. `components/layout/SearchButton.jsx` → `SearchButton.tsx`
6. `components/layout/SearchModal.jsx` → `SearchModal.tsx`
7. `components/layout/SearchFilters.jsx` → `SearchFilters.tsx`
8. `components/layout/TrashButton.jsx` → `TrashButton.tsx`
9. `components/layout/TrashModal.jsx` → `TrashModal.tsx`
10. `components/layout/AuthorFilterModal.jsx` → `AuthorFilterModal.tsx`
11. `components/layout/DateFilterModal.jsx` → `DateFilterModal.tsx`

**이유**: 레이아웃은 앱의 기본 구조이므로 타입 안정성이 중요합니다.

---

## Phase 9: 인증 및 에러 컴포넌트

### 9.1 인증 컴포넌트 (4개)
1. `components/auth/LoginForm.jsx` → `LoginForm.tsx`
2. `components/auth/RegisterForm.jsx` → `RegisterForm.tsx`
3. `components/auth/SignupForm.jsx` → `SignupForm.tsx`
4. `components/auth/GoogleAuth.jsx` → `GoogleAuth.tsx`

### 9.2 에러 컴포넌트 (2개)
1. `components/error/ErrorBoundary.jsx` → `ErrorBoundary.tsx`
2. `components/error/ErrorMessage.jsx` → `ErrorMessage.tsx`

**이유**: 비교적 간단하고 독립적인 컴포넌트입니다.

---

## Phase 10: 문서 관련 컴포넌트 (핵심 비즈니스 로직)

### 10.1 문서 메인 컴포넌트 (3개) ⭐⭐⭐
**우선순위: 매우 높음** - 핵심 기능

1. `components/documents/DocumentList.jsx` → `DocumentList.tsx` (584줄)
2. `components/documents/DocumentEditor.jsx` → `DocumentEditor.tsx` (454줄)
3. `components/documents/DocumentTableView.jsx` → `DocumentTableView.tsx` (679줄)

**이유**: 가장 복잡하고 중요한 컴포넌트입니다. 신중하게 진행해야 합니다.

### 10.2 문서 헤더 및 뷰 (3개)
1. `components/documents/DocumentHeader.jsx` → `DocumentHeader.tsx`
2. `components/documents/DocumentPageView.jsx` → `DocumentPageView.tsx`
3. `components/documents/VersionHistoryPanel.jsx` → `VersionHistoryPanel.tsx`

### 10.3 문서 팝오버 및 모달 (4개)
1. `components/documents/DocumentSharePopover.jsx` → `DocumentSharePopover.tsx`
2. `components/documents/AddPropertyPopover.jsx` → `AddPropertyPopover.tsx`
3. `components/documents/DatePopover.jsx` → `DatePopover.tsx`
4. `components/documents/TagPopover.jsx` → `TagPopover.tsx`

### 10.4 페이지 뷰 컴포넌트 (3개)
1. `components/documents/page/PageHeaderArea.jsx` → `PageHeaderArea.tsx`
2. `components/documents/page/PagePropertyList.jsx` → `PagePropertyList.tsx`
3. `components/documents/page/PagePropertyRow.jsx` → `PagePropertyRow.tsx`

### 10.5 페이지 뷰 훅 (1개)
1. `components/documents/page/hooks/usePageData.js` → `usePageData.ts`

---

## Phase 11: 테이블 뷰 컴포넌트

### 11.1 테이블 메인 컴포넌트 (3개)
1. `components/documents/table/TableHeader.jsx` → `TableHeader.tsx`
2. `components/documents/table/TableRow.jsx` → `TableRow.tsx`
3. `components/documents/table/TableToolbar.jsx` → `TableToolbar.tsx`

### 11.2 테이블 셀 컴포넌트 (2개)
1. `components/documents/table/cells/NameCell.jsx` → `NameCell.tsx`
2. `components/documents/table/cells/PropertyCell.jsx` → `PropertyCell.tsx`

### 11.3 테이블 유틸리티 및 훅 (6개)
1. `components/documents/table/utils.jsx` → `utils.tsx`
2. `components/documents/table/hooks/useTableData.js` → `useTableData.ts`
3. `components/documents/table/hooks/useTableSort.js` → `useTableSort.ts`
4. `components/documents/table/hooks/useTableFilters.js` → `useTableFilters.ts`
5. `components/documents/table/hooks/useTableSearch.js` → `useTableSearch.ts`
6. `components/documents/table/hooks/useColumnResize.js` → `useColumnResize.ts`

### 11.4 테이블 드롭다운 및 관리 (4개)
1. `components/documents/table/SortDropdown.jsx` → `SortDropdown.tsx`
2. `components/documents/table/SortManager.jsx` → `SortManager.tsx`
3. `components/documents/table/FilterDropdown.jsx` → `FilterDropdown.tsx`
4. `components/documents/table/SearchSlideInput.jsx` → `SearchSlideInput.tsx`
5. `components/documents/table/SortablePropertyHeader.jsx` → `SortablePropertyHeader.tsx`

---

## Phase 12: 에디터 컴포넌트

### 12.1 에디터 메인 (4개)
1. `components/editor/Editor.jsx` → `Editor.tsx`
2. `components/editor/EditorMenuBar.jsx` → `EditorMenuBar.tsx`
3. `components/editor/ResizableImage.jsx` → `ResizableImage.tsx`
4. `components/editor/CustomImage.js` → `CustomImage.ts`

### 12.2 에디터 확장 (2개)
1. `components/editor/extensions/BlockDragHandle.js` → `BlockDragHandle.ts`
2. `components/editor/extensions/TabIndent.js` → `TabIndent.ts`

**이유**: TipTap 에디터 관련 컴포넌트는 타입 정의가 복잡할 수 있습니다.

---

## Phase 13: 설정 및 워크스페이스

### 13.1 설정 컴포넌트 (8개)
1. `components/settings/SettingsPanel.jsx` → `SettingsPanel.tsx`
2. `components/settings/AccountBasicForm.jsx` → `AccountBasicForm.tsx`
3. `components/settings/WorkspaceGeneralForm.jsx` → `WorkspaceGeneralForm.tsx`
4. `components/settings/UserManagementPanel.jsx` → `UserManagementPanel.tsx`
5. `components/settings/UserActionPopover.jsx` → `UserActionPopover.tsx`
6. `components/settings/BulkUserActionPopover.jsx` → `BulkUserActionPopover.tsx`
7. `components/settings/DummyDataTestPanel.jsx` → `DummyDataTestPanel.tsx`

### 13.2 설정 훅 (4개)
1. `components/settings/hooks/useUserTableData.js` → `useUserTableData.ts`
2. `components/settings/hooks/useUserTableFilters.js` → `useUserTableFilters.ts`
3. `components/settings/hooks/useUserTableSearch.js` → `useUserTableSearch.ts`
4. `components/settings/hooks/useUserTableSort.js` → `useUserTableSort.ts`

### 13.3 워크스페이스 컴포넌트 (4개)
1. `components/workspace/WorkspaceIcon.jsx` → `WorkspaceIcon.tsx`
2. `components/workspace/WorkspaceList.jsx` → `WorkspaceList.tsx`
3. `components/workspace/WorkspaceSettingsModal.jsx` → `WorkspaceSettingsModal.tsx`
4. `components/workspace/WorkspaceList.test.jsx` → `WorkspaceList.test.tsx` (테스트 파일)

---

## Phase 14: 알림 및 기타

### 14.1 알림 컴포넌트 (2개)
1. `components/notifications/Notifications.jsx` → `Notifications.tsx`
2. `components/notifications/NotificationModal.jsx` → `NotificationModal.tsx`

### 14.2 기타 (1개)
1. `components/examples/PermissionExample.jsx` → `PermissionExample.tsx` (예제 파일, 낮은 우선순위)

---

## 권장 작업 순서 요약

### 즉시 시작 (Phase 6)
1. **스토어 변환** (5개) - 가장 중요
2. **핵심 훅 변환** (7개) - 의존성 높음

### 다음 단계 (Phase 7-8)
3. **유틸리티 및 상수** (5개)
4. **엔트리 포인트 및 레이아웃** (13개)

### 중기 (Phase 9-10)
5. **인증 및 에러** (6개)
6. **문서 핵심 컴포넌트** (3개) - 가장 복잡, 신중하게

### 후기 (Phase 11-14)
7. **테이블 뷰** (15개)
8. **에디터** (6개)
9. **설정 및 워크스페이스** (16개)
10. **알림 및 기타** (3개)

---

## 작업 팁

### 1. 배치 작업
- 관련 파일들을 그룹으로 묶어서 함께 변환 (예: 테이블 관련 모든 파일)
- 한 번에 하나의 도메인 완료

### 2. 점진적 접근
- 큰 파일(DocumentEditor, DocumentTableView)은 여러 단계로 나누어 작업
- 먼저 타입 정의만 추가하고, 점진적으로 개선

### 3. 테스트
- 각 Phase 완료 후 빌드 및 테스트 실행
- 린터 에러 즉시 수정

### 4. 커밋 전략
- Phase별로 커밋 (예: "feat: Phase 6 - 스토어 TypeScript 변환")
- 큰 파일은 파일별로 커밋
