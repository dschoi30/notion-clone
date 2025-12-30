# 프론트엔드 테스트 전략 및 마이그레이션 가이드

> **현재 진행 상황**: Phase 1 ✅ 완료, Phase 2 ✅ 완료 (156개 테스트 통과)  
> **최종 업데이트**: 2025-12-31

## 목차
1. [현재 상태 분석](#현재-상태-분석)
2. [테스트 프레임워크 추천](#테스트-프레임워크-추천)
3. [테스트 전략](#테스트-전략)
4. [단계적 마이그레이션 계획](#단계적-마이그레이션-계획)
5. [테스트 작성 가이드](#테스트-작성-가이드)
6. [CI/CD 통합](#cicd-통합)

---

## 현재 상태 분석

### 설치된 테스트 도구 (2025-12-31 업데이트)
- ✅ **Vitest 2.0.0**: 단위 테스트 프레임워크 (활성 사용 중)
- ✅ **@vitest/ui 2.0.0**: Vitest UI 인터페이스
- ✅ **@vitest/coverage-v8 2.0.0**: 코드 커버리지 도구
- ✅ **jsdom 24.0.0**: 브라우저 환경 시뮬레이션
- ✅ **MSW 2.0.0**: API 모킹 (Mock Service Worker)
- ✅ **React Testing Library 16.3.0**: 컴포넌트 테스트 라이브러리
- ✅ **@testing-library/jest-dom 6.9.1**: DOM 매처 확장 (Vitest와 호환)
- ✅ **@testing-library/user-event 14.6.1**: 사용자 이벤트 시뮬레이션
- ✅ **Playwright 1.52.0**: E2E 테스트 프레임워크

**제거된 도구 (2025-12-31):**
- ❌ **Jest**: Vitest로 완전히 마이그레이션 완료
- ❌ **identity-obj-proxy**: Jest CSS 모킹 도구 (더 이상 필요 없음)
- ❌ **jest.config.cjs**: Jest 설정 파일 (제거됨)

### 현재 테스트 현황 (2025-12-31 업데이트)
- ✅ **테스트 파일**: 11개 (단위 테스트)
  - `WorkspaceList.test.tsx` (7개 테스트)
  - `utils.test.ts`, `colors.test.ts`, `permissionUtils.test.ts`, `errorUtils.test.ts` (유틸리티)
  - `useDebounce.test.ts`, `useThrottle.test.ts`, `useErrorHandler.test.ts`, `useToast.test.ts`, `useWorkspacePermissions.test.ts` (훅)
  - `authSync.test.ts` (인증 동기화)
- ✅ **총 테스트 수**: 156개 (모두 통과)
- ✅ **Vitest 설정**: `vitest.config.ts` 완료
- ✅ **MSW 설정**: `src/mocks/` 디렉토리 완료
- ✅ **E2E 테스트**: `playwright/ws-403.spec.ts` 존재

### 해결된 문제점 ✅
1. ~~**Jest와 Vite의 호환성 이슈**~~: ✅ Vitest로 마이그레이션 완료
2. ~~**API 모킹 부재**~~: ✅ MSW 설치 및 설정 완료
3. ~~**테스트 스크립트 미설정**~~: ✅ 테스트 스크립트 추가 완료

### 남은 과제
1. **테스트 커버리지 확대**: 현재 18.07% (전체 코드 기준), Phase 3-7 진행으로 목표 달성 예정

**완료된 정리 작업 (2025-12-31):**
- ✅ Jest 관련 직접 의존성 제거 완료
- ✅ `identity-obj-proxy` 제거 완료
- ✅ 모든 테스트가 Vitest로 마이그레이션 완료
- ✅ Jest 설정 파일 제거 완료

---

## 테스트 프레임워크 추천

### 1. 단위 테스트: **Vitest** (추천)

**추천 이유:**
- ✅ Vite와 완벽한 통합 (같은 설정 파일 사용)
- ✅ ESM 네이티브 지원
- ✅ Jest와 유사한 API (마이그레이션 용이)
- ✅ 빠른 실행 속도 (Vite의 번들러 활용)
- ✅ TypeScript 네이티브 지원
- ✅ Watch 모드 및 커버리지 내장

**대안: Jest**
- ❌ Vite와의 통합이 복잡함
- ❌ CommonJS 기반으로 ESM 변환 필요
- ✅ 널리 사용되는 프레임워크
- ✅ 풍부한 생태계

**결론: Vitest로 마이그레이션 권장**

### 2. 컴포넌트 테스트: **React Testing Library** (유지)

**현재 사용 중이며 그대로 유지:**
- ✅ 사용자 중심 테스트 접근법
- ✅ 접근성 테스트 지원
- ✅ React 18 완벽 지원
- ✅ 이미 프로젝트에 설치됨

### 3. 통합 테스트: **MSW (Mock Service Worker)** (추가 필요)

**추천 이유:**
- ✅ 네트워크 레벨에서 API 모킹
- ✅ 브라우저와 Node.js 환경 모두 지원
- ✅ 실제 HTTP 요청을 가로채서 모킹
- ✅ React Query와 완벽한 통합
- ✅ 실제 API 응답과 유사한 테스트 가능

### 4. E2E 테스트: **Playwright** (유지)

**현재 사용 중이며 그대로 유지:**
- ✅ 크로스 브라우저 테스트 지원
- ✅ 자동 대기 및 안정성
- ✅ 스크린샷 및 비디오 녹화
- ✅ 이미 프로젝트에 설치됨

---

## 테스트 전략

### 테스트 피라미드

```
        /\
       /  \  E2E Tests (Playwright)
      /____\   - 주요 사용자 플로우
     /      \  - 크리티컬 경로
    /________\  - 회귀 테스트
   /          \
  / Integration \  Integration Tests (Vitest + MSW)
 /______________\  - API 통합 테스트
/                \
/   Unit Tests     \  Unit Tests (Vitest + RTL)
/__________________\  - 유틸리티 함수
                    - 훅
                    - 순수 컴포넌트
                    - 스토어 로직
```

### 테스트 범위

#### 단위 테스트 (Unit Tests)
**대상:**
- 유틸리티 함수 (`src/utils/`, `src/lib/`)
- 커스텀 훅 (`src/hooks/`)
- Zustand 스토어 (`src/stores/`)
- 순수 컴포넌트 (props만 받는 UI 컴포넌트)
- 서비스 레이어 (`src/services/`)

**목표 커버리지: 80% 이상**

#### 통합 테스트 (Integration Tests)
**대상:**
- React Query 훅과 API 통합
- 컴포넌트 + Context 통합
- 컴포넌트 + Zustand 스토어 통합
- 폼 제출 및 API 호출 플로우
- 권한 체크 로직

**목표 커버리지: 70% 이상**

#### E2E 테스트 (End-to-End Tests)
**대상:**
- 사용자 인증 플로우
- 문서 생성/편집/삭제 플로우
- 실시간 협업 기능
- 권한 관리 플로우
- 테이블 뷰 DnD 및 필터링

**목표: 주요 사용자 시나리오 100% 커버**

---

## 단계적 마이그레이션 계획

### Phase 1: 테스트 환경 구축 (1주)

#### 1.1 Vitest 설치 및 설정
```bash
pnpm add -D vitest @vitest/ui @vitest/coverage-v8 jsdom
```

**설정 파일:**
- `vitest.config.ts` 생성

#### 1.2 MSW 설치 및 설정
```bash
pnpm add -D msw
```

**설정:**
- `src/mocks/handlers.ts`: API 핸들러 정의
- `src/mocks/server.ts`: Node.js 서버 설정
- `src/mocks/browser.ts`: 브라우저 서버 설정
- `src/setupTests.ts`: 테스트 설정 파일

#### 1.3 테스트 스크립트 추가
`package.json`에 추가:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test"
  }
}
```

#### 1.4 기존 Jest 테스트 마이그레이션
- `WorkspaceList.test.jsx` → Vitest 문법으로 변환
- Jest mock → Vitest mock으로 변경

**체크리스트:**
- [ ] Vitest 설치 및 설정 완료
- [ ] MSW 설치 및 기본 핸들러 설정
- [ ] 테스트 스크립트 추가
- [ ] 기존 테스트 파일 마이그레이션
- [ ] CI/CD 파이프라인에 테스트 추가

---

### Phase 2: 핵심 유틸리티 테스트 (1주)

#### 2.1 유틸리티 함수 테스트
**우선순위:**
1. `src/utils/permissionUtils.ts` - 권한 체크 로직
2. `src/utils/authSync.ts` - 인증 동기화
3. `src/lib/utils.ts` - 공통 유틸리티
4. `src/lib/errorUtils.ts` - 에러 처리
5. `src/lib/colors.ts` - 색상 유틸리티

**목표:** 모든 유틸리티 함수에 대한 단위 테스트 작성

#### 2.2 커스텀 훅 테스트
**우선순위:**
1. `useDebounce.ts` - 디바운스 로직
2. `useThrottle.ts` - 쓰로틀 로직
3. `useErrorHandler.ts` - 에러 핸들링
4. `useToast.ts` - Toast 알림
5. `useWorkspacePermissions.ts` - 권한 체크

**목표:** 모든 커스텀 훅에 대한 단위 테스트 작성

**체크리스트:**
- [ ] 유틸리티 함수 테스트 작성 (5개 파일)
- [ ] 커스텀 훅 테스트 작성 (5개 파일)
- [ ] 커버리지 80% 이상 달성

---

### Phase 3: 스토어 및 서비스 테스트 (1주)

#### 3.1 Zustand 스토어 테스트
**대상:**
1. `authStore.ts` - 인증 상태 관리
2. `documentStore.ts` - 문서 상태 관리
3. `workspaceStore.ts` - 워크스페이스 상태 관리
4. `uiStore.ts` - UI 상태 관리
5. `notificationStore.ts` - 알림 상태 관리

**테스트 포인트:**
- 초기 상태 확인
- 액션 실행 및 상태 변경
- 미들웨어 동작 (persist 등)

#### 3.2 API 서비스 테스트
**대상:**
1. `services/api.ts` - Axios 인스턴스 및 인터셉터
2. `services/auth.ts` - 인증 API
3. `services/documentApi.ts` - 문서 API
4. `services/workspaceApi.ts` - 워크스페이스 API
5. `services/userApi.ts` - 사용자 API

**테스트 포인트:**
- API 호출 함수 동작
- 에러 처리
- 인터셉터 동작

**체크리스트:**
- [ ] Zustand 스토어 테스트 작성 (5개)
- [ ] API 서비스 테스트 작성 (5개)
- [ ] MSW 핸들러 작성 (주요 API 엔드포인트)

---

### Phase 4: UI 컴포넌트 단위 테스트 (2주)

#### 4.1 공통 UI 컴포넌트 (우선순위: 높음)
**대상:**
1. `components/ui/button.tsx`
2. `components/ui/input.tsx`
3. `components/ui/dialog.tsx`
4. `components/ui/checkbox.tsx`
5. `components/ui/select.tsx`
6. `components/ui/toast.tsx`
7. `components/ui/tooltip.tsx`

**테스트 포인트:**
- 렌더링 확인
- 사용자 인터랙션 (클릭, 입력 등)
- 접근성 (ARIA 속성)
- props 변경에 따른 동작

#### 4.2 레이아웃 컴포넌트
**대상:**
1. `components/layout/MainLayout.tsx`
2. `components/layout/Sidebar.tsx`
3. `components/layout/AppRouter.tsx`
4. `components/layout/AuthRouter.tsx`

**테스트 포인트:**
- 라우팅 동작
- 인증 상태에 따른 리다이렉트
- 레이아웃 구조

#### 4.3 인증 컴포넌트
**대상:**
1. `components/auth/LoginForm.tsx`
2. `components/auth/RegisterForm.tsx`
3. `components/auth/SignupForm.tsx`

**테스트 포인트:**
- 폼 유효성 검사
- 제출 동작
- 에러 메시지 표시

**체크리스트:**
- [ ] 공통 UI 컴포넌트 테스트 (7개)
- [ ] 레이아웃 컴포넌트 테스트 (4개)
- [ ] 인증 컴포넌트 테스트 (3개)

---

### Phase 5: 문서 관련 컴포넌트 통합 테스트 (2주)

#### 5.1 문서 편집기 컴포넌트
**대상:**
1. `components/documents/DocumentEditor.tsx`
2. `components/documents/DocumentHeader.tsx`
3. `components/editor/Editor.tsx`
4. `components/editor/EditorMenuBar.tsx`

**테스트 포인트:**
- TipTap 에디터 초기화
- 에디터 툴바 동작
- 문서 저장 플로우
- 실시간 협업 (WebSocket 모킹)

#### 5.2 문서 뷰 컴포넌트
**대상:**
1. `components/documents/DocumentPageView.tsx`
2. `components/documents/DocumentTableView.tsx`
3. `components/documents/DocumentList.tsx`

**테스트 포인트:**
- 문서 목록 렌더링
- 테이블 뷰 필터링/정렬
- 페이지 뷰 속성 표시
- DnD 동작 (dnd-kit)

#### 5.3 문서 속성 컴포넌트
**대상:**
1. `components/documents/page/PagePropertyList.tsx`
2. `components/documents/page/PagePropertyRow.tsx`
3. `components/documents/AddPropertyPopover.tsx`

**테스트 포인트:**
- 속성 추가/수정/삭제
- 속성 타입별 렌더링
- 속성 값 업데이트

**체크리스트:**
- [ ] 문서 편집기 컴포넌트 테스트 (4개)
- [ ] 문서 뷰 컴포넌트 테스트 (3개)
- [ ] 문서 속성 컴포넌트 테스트 (3개)
- [ ] React Query 통합 테스트
- [ ] WebSocket 모킹 테스트

---

### Phase 6: 고급 기능 통합 테스트 (1주)

#### 6.1 테이블 뷰 고급 기능
**대상:**
- `components/documents/table/TableToolbar.tsx`
- `components/documents/table/FilterDropdown.tsx`
- `components/documents/table/SortDropdown.tsx`
- `components/documents/table/TableRow.tsx`

**테스트 포인트:**
- 필터링 동작
- 정렬 동작
- 행 DnD
- 다중 선택 및 삭제

#### 6.2 권한 관리 컴포넌트
**대상:**
- `components/ui/PermissionGate.tsx`
- `components/ui/PermissionButton.tsx`
- `components/documents/DocumentSharePopover.tsx`

**테스트 포인트:**
- 권한 체크 로직
- 권한에 따른 UI 표시
- 권한 변경 플로우

#### 6.3 설정 컴포넌트
**대상:**
- `components/settings/SettingsPanel.tsx`
- `components/settings/UserManagementPanel.tsx`
- `components/settings/AccountBasicForm.tsx`

**테스트 포인트:**
- 설정 변경 플로우
- 사용자 관리 동작
- 폼 유효성 검사

**체크리스트:**
- [ ] 테이블 뷰 고급 기능 테스트
- [ ] 권한 관리 컴포넌트 테스트
- [ ] 설정 컴포넌트 테스트

---

### Phase 7: E2E 테스트 확장 (1주)

#### 7.1 주요 사용자 플로우

##### 7.1.1 사용자 인증 플로우
**테스트 파일**: `playwright/auth-flow.spec.ts`

**시나리오 1: 회원가입 및 첫 로그인**
```typescript
test('새 사용자가 회원가입하고 로그인할 수 있다', async ({ page }) => {
  // 1. 회원가입 페이지 접근
  await page.goto('/register');
  
  // 2. 회원가입 폼 작성
  await page.fill('input[name="email"]', 'newuser@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.fill('input[name="name"]', '새 사용자');
  
  // 3. 회원가입 제출
  await page.click('button[type="submit"]');
  
  // 4. 로그인 페이지로 리다이렉트 확인
  await expect(page).toHaveURL('/login');
  
  // 5. 로그인
  await page.fill('input[name="email"]', 'newuser@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // 6. 메인 페이지로 리다이렉트 확인
  await expect(page).toHaveURL(/\/(\d+)-/);
  
  // 7. 사용자 정보 표시 확인
  await expect(page.locator('text=새 사용자')).toBeVisible();
});
```

**시나리오 2: 로그인 실패 처리**
```typescript
test('잘못된 자격증명으로 로그인 시 에러 메시지가 표시된다', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'wrong@example.com');
  await page.fill('input[name="password"]', 'wrongpassword');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=/이메일 또는 비밀번호가 올바르지 않습니다/')).toBeVisible();
  await expect(page).toHaveURL('/login');
});
```

**시나리오 3: 로그아웃**
```typescript
test('사용자가 로그아웃할 수 있다', async ({ page }) => {
  // 로그인 상태로 시작
  await loginUser(page, 'test@example.com', 'password123');
  
  // 프로필 메뉴 클릭
  await page.click('[aria-label="사용자 메뉴"]');
  
  // 로그아웃 클릭
  await page.click('text=로그아웃');
  
  // 로그인 페이지로 리다이렉트 확인
  await expect(page).toHaveURL('/login');
});
```

##### 7.1.2 워크스페이스 및 문서 생성 플로우
**테스트 파일**: `playwright/workspace-document-creation.spec.ts`

**시나리오 1: 워크스페이스 생성**
```typescript
test('사용자가 새 워크스페이스를 생성할 수 있다', async ({ page }) => {
  await loginUser(page);
  
  // 워크스페이스 생성 버튼 클릭
  await page.click('[aria-label="워크스페이스 추가"]');
  
  // 워크스페이스 이름 입력
  await page.fill('input[placeholder="워크스페이스 이름"]', '새 워크스페이스');
  await page.click('button:has-text("생성")');
  
  // 사이드바에 새 워크스페이스 표시 확인
  await expect(page.locator('text=새 워크스페이스')).toBeVisible();
});
```

**시나리오 2: 문서 생성**
```typescript
test('사용자가 새 문서를 생성할 수 있다', async ({ page }) => {
  await loginUser(page);
  
  // 새 문서 버튼 클릭
  await page.click('button:has-text("새 문서")');
  
  // 문서 제목 입력
  await page.fill('input[placeholder="제목 없음"]', '테스트 문서');
  await page.press('input[placeholder="제목 없음"]', 'Enter');
  
  // 문서가 생성되고 편집기로 이동 확인
  await expect(page).toHaveURL(/\/(\d+)-테스트-문서/);
  await expect(page.locator('h1:has-text("테스트 문서")')).toBeVisible();
});
```

**시나리오 3: 문서를 폴더로 이동**
```typescript
test('사용자가 문서를 드래그 앤 드롭으로 이동할 수 있다', async ({ page }) => {
  await loginUser(page);
  
  // 문서와 폴더 생성
  const document = await createDocument(page, '이동할 문서');
  const folder = await createFolder(page, '대상 폴더');
  
  // 문서를 폴더로 드래그
  const documentElement = page.locator(`[data-document-id="${document.id}"]`);
  const folderElement = page.locator(`[data-folder-id="${folder.id}"]`);
  
  await documentElement.dragTo(folderElement);
  
  // 문서가 폴더 내부에 표시되는지 확인
  await expect(folderElement.locator('text=이동할 문서')).toBeVisible();
});
```

##### 7.1.3 문서 편집 및 저장 플로우
**테스트 파일**: `playwright/document-editing.spec.ts`

**시나리오 1: 문서 내용 편집 및 자동 저장**
```typescript
test('사용자가 문서를 편집하고 자동 저장된다', async ({ page }) => {
  await loginUser(page);
  const doc = await createDocument(page, '편집 테스트 문서');
  
  // 에디터에 내용 입력
  const editor = page.locator('.ProseMirror');
  await editor.click();
  await editor.type('이것은 테스트 내용입니다.');
  
  // 자동 저장 대기 (일반적으로 2-3초)
  await page.waitForTimeout(3000);
  
  // 저장 표시 확인
  await expect(page.locator('text=/저장됨|Saved/')).toBeVisible();
  
  // 페이지 새로고침 후 내용 유지 확인
  await page.reload();
  await expect(editor.locator('text=이것은 테스트 내용입니다.')).toBeVisible();
});
```

**시나리오 2: 문서 제목 변경**
```typescript
test('사용자가 문서 제목을 변경할 수 있다', async ({ page }) => {
  await loginUser(page);
  const doc = await createDocument(page, '원본 제목');
  
  // 제목 클릭하여 편집 모드
  const titleInput = page.locator('h1 input, h1[contenteditable]');
  await titleInput.click();
  await titleInput.fill('변경된 제목');
  await titleInput.press('Enter');
  
  // URL과 제목이 업데이트되었는지 확인
  await expect(page).toHaveURL(/\/(\d+)-변경된-제목/);
  await expect(page.locator('h1:has-text("변경된 제목")')).toBeVisible();
});
```

**시나리오 3: TipTap 에디터 포맷팅 기능**
```typescript
test('사용자가 텍스트 포맷팅을 적용할 수 있다', async ({ page }) => {
  await loginUser(page);
  const doc = await createDocument(page, '포맷팅 테스트');
  
  const editor = page.locator('.ProseMirror');
  await editor.click();
  await editor.type('볼드 텍스트');
  
  // 텍스트 선택
  await page.keyboard.press('Shift+ArrowLeft+ArrowLeft+ArrowLeft+ArrowLeft');
  
  // 볼드 버튼 클릭
  await page.click('[aria-label="볼드"]');
  
  // 볼드 스타일 적용 확인
  await expect(editor.locator('strong:has-text("볼드")')).toBeVisible();
});
```

##### 7.1.4 문서 공유 및 권한 관리 플로우
**테스트 파일**: `playwright/document-sharing.spec.ts`

**시나리오 1: 문서 공유 및 읽기 권한 부여**
```typescript
test('사용자가 문서를 다른 사용자와 공유할 수 있다', async ({ page, context }) => {
  await loginUser(page, 'owner@example.com');
  const doc = await createDocument(page, '공유 문서');
  
  // 공유 버튼 클릭
  await page.click('[aria-label="공유"]');
  
  // 이메일 입력
  await page.fill('input[placeholder="이메일 입력"]', 'collaborator@example.com');
  
  // 권한 선택 (읽기)
  await page.selectOption('select[name="permission"]', 'READ');
  
  // 공유 버튼 클릭
  await page.click('button:has-text("공유")');
  
  // 공유 성공 메시지 확인
  await expect(page.locator('text=/공유되었습니다/')).toBeVisible();
  
  // 다른 브라우저 컨텍스트에서 공유받은 사용자로 로그인
  const newPage = await context.newPage();
  await loginUser(newPage, 'collaborator@example.com');
  
  // 공유된 문서가 표시되는지 확인
  await expect(newPage.locator('text=공유 문서')).toBeVisible();
  
  // 읽기 권한만 있으므로 편집 불가 확인
  const editor = newPage.locator('.ProseMirror');
  await editor.click();
  await expect(editor).toBeDisabled();
});
```

**시나리오 2: 권한 변경**
```typescript
test('문서 소유자가 공유된 사용자의 권한을 변경할 수 있다', async ({ page }) => {
  await loginUser(page, 'owner@example.com');
  const doc = await createDocument(page, '권한 테스트 문서');
  
  // 공유 설정 열기
  await page.click('[aria-label="공유"]');
  
  // 기존 공유 사용자 찾기
  const collaboratorRow = page.locator('text=collaborator@example.com').locator('..');
  
  // 권한 드롭다운 변경 (읽기 → 쓰기)
  await collaboratorRow.locator('select').selectOption('WRITE');
  
  // 저장
  await page.click('button:has-text("저장")');
  
  // 성공 메시지 확인
  await expect(page.locator('text=/권한이 변경되었습니다/')).toBeVisible();
});
```

##### 7.1.5 테이블 뷰 기능 플로우
**테스트 파일**: `playwright/table-view.spec.ts`

**시나리오 1: 테이블 뷰로 전환 및 필터링**
```typescript
test('사용자가 테이블 뷰에서 문서를 필터링할 수 있다', async ({ page }) => {
  await loginUser(page);
  
  // 여러 문서 생성
  await createDocument(page, '문서 A');
  await createDocument(page, '문서 B');
  await createDocument(page, '문서 C');
  
  // 테이블 뷰로 전환
  await page.click('[aria-label="테이블 뷰"]');
  
  // 필터 추가
  await page.click('[aria-label="필터 추가"]');
  await page.selectOption('select[name="property"]', 'title');
  await page.selectOption('select[name="operator"]', 'contains');
  await page.fill('input[name="value"]', '문서 A');
  
  // 필터 적용
  await page.click('button:has-text("적용")');
  
  // 필터링된 결과만 표시되는지 확인
  await expect(page.locator('text=문서 A')).toBeVisible();
  await expect(page.locator('text=문서 B')).not.toBeVisible();
  await expect(page.locator('text=문서 C')).not.toBeVisible();
});
```

**시나리오 2: 테이블 뷰 정렬**
```typescript
test('사용자가 테이블 뷰에서 문서를 정렬할 수 있다', async ({ page }) => {
  await loginUser(page);
  
  // 여러 문서 생성 (다른 생성 시간)
  await createDocument(page, '문서 1');
  await page.waitForTimeout(1000);
  await createDocument(page, '문서 2');
  await page.waitForTimeout(1000);
  await createDocument(page, '문서 3');
  
  // 테이블 뷰로 전환
  await page.click('[aria-label="테이블 뷰"]');
  
  // 생성일 컬럼 헤더 클릭하여 정렬
  await page.click('th:has-text("생성일")');
  
  // 내림차순 정렬 확인
  const rows = page.locator('tbody tr');
  await expect(rows.first().locator('text=문서 3')).toBeVisible();
});
```

**시나리오 3: 테이블 뷰 행 DnD 및 다중 선택 삭제**
```typescript
test('사용자가 테이블 뷰에서 행을 드래그하여 순서를 변경할 수 있다', async ({ page }) => {
  await loginUser(page);
  
  // 여러 문서 생성
  const doc1 = await createDocument(page, '문서 1');
  const doc2 = await createDocument(page, '문서 2');
  const doc3 = await createDocument(page, '문서 3');
  
  // 테이블 뷰로 전환
  await page.click('[aria-label="테이블 뷰"]');
  
  // 첫 번째 행을 세 번째 위치로 드래그
  const row1 = page.locator(`tr[data-document-id="${doc1.id}"]`);
  const row3 = page.locator(`tr[data-document-id="${doc3.id}"]`);
  
  await row1.dragTo(row3);
  
  // 순서 변경 확인
  const rows = page.locator('tbody tr');
  await expect(rows.nth(2).locator('text=문서 1')).toBeVisible();
});

test('사용자가 테이블 뷰에서 여러 행을 선택하고 삭제할 수 있다', async ({ page }) => {
  await loginUser(page);
  
  // 여러 문서 생성
  const doc1 = await createDocument(page, '삭제할 문서 1');
  const doc2 = await createDocument(page, '삭제할 문서 2');
  const doc3 = await createDocument(page, '유지할 문서');
  
  // 테이블 뷰로 전환
  await page.click('[aria-label="테이블 뷰"]');
  
  // 체크박스로 다중 선택
  await page.locator(`tr[data-document-id="${doc1.id}"] input[type="checkbox"]`).check();
  await page.locator(`tr[data-document-id="${doc2.id}"] input[type="checkbox"]`).check();
  
  // 삭제 버튼 클릭
  await page.click('[aria-label="선택 항목 삭제"]');
  
  // 확인 다이얼로그
  await page.click('button:has-text("삭제")');
  
  // 선택한 문서들이 삭제되었는지 확인
  await expect(page.locator('text=삭제할 문서 1')).not.toBeVisible();
  await expect(page.locator('text=삭제할 문서 2')).not.toBeVisible();
  await expect(page.locator('text=유지할 문서')).toBeVisible();
});
```

##### 7.1.6 문서 삭제 및 복구 플로우
**테스트 파일**: `playwright/document-deletion.spec.ts`

**시나리오 1: 문서 삭제**
```typescript
test('사용자가 문서를 삭제할 수 있다', async ({ page }) => {
  await loginUser(page);
  const doc = await createDocument(page, '삭제할 문서');
  
  // 삭제 버튼 클릭
  await page.click('[aria-label="문서 메뉴"]');
  await page.click('text=삭제');
  
  // 확인 다이얼로그
  await page.click('button:has-text("삭제")');
  
  // 문서가 목록에서 제거되었는지 확인
  await expect(page.locator('text=삭제할 문서')).not.toBeVisible();
  
  // 휴지통으로 이동 확인 (사이드바)
  await page.click('[aria-label="휴지통"]');
  await expect(page.locator('text=삭제할 문서')).toBeVisible();
});
```

**시나리오 2: 문서 복구**
```typescript
test('사용자가 삭제된 문서를 복구할 수 있다', async ({ page }) => {
  await loginUser(page);
  const doc = await createDocument(page, '복구할 문서');
  
  // 문서 삭제
  await page.click('[aria-label="문서 메뉴"]');
  await page.click('text=삭제');
  await page.click('button:has-text("삭제")');
  
  // 휴지통으로 이동
  await page.click('[aria-label="휴지통"]');
  
  // 복구 버튼 클릭
  await page.locator('text=복구할 문서').locator('..').locator('[aria-label="복구"]').click();
  
  // 문서가 목록으로 복구되었는지 확인
  await page.click('[aria-label="모든 문서"]');
  await expect(page.locator('text=복구할 문서')).toBeVisible();
});
```

**시나리오 3: 영구 삭제**
```typescript
test('사용자가 문서를 영구적으로 삭제할 수 있다', async ({ page }) => {
  await loginUser(page);
  const doc = await createDocument(page, '영구 삭제할 문서');
  
  // 문서 삭제
  await page.click('[aria-label="문서 메뉴"]');
  await page.click('text=삭제');
  await page.click('button:has-text("삭제")');
  
  // 휴지통으로 이동
  await page.click('[aria-label="휴지통"]');
  
  // 영구 삭제
  await page.locator('text=영구 삭제할 문서').locator('..').locator('[aria-label="영구 삭제"]').click();
  await page.click('button:has-text("영구 삭제")');
  
  // 문서가 완전히 제거되었는지 확인
  await expect(page.locator('text=영구 삭제할 문서')).not.toBeVisible();
});
```

#### 7.2 실시간 협업 테스트
**테스트 파일**: `playwright/collaboration.spec.ts`

**시나리오 1: 다중 사용자 동시 편집**
```typescript
test('여러 사용자가 동시에 문서를 편집할 수 있다', async ({ browser }) => {
  // 두 개의 브라우저 컨텍스트 생성
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  // 두 사용자 로그인
  await loginUser(page1, 'user1@example.com');
  await loginUser(page2, 'user2@example.com');
  
  // user1이 문서 생성 및 공유
  const doc = await createDocument(page1, '협업 문서');
  await shareDocument(page1, doc.id, 'user2@example.com', 'WRITE');
  
  // user2가 문서 열기
  await page2.goto(`/${doc.id}-협업-문서`);
  
  // 두 사용자가 동시에 편집
  const editor1 = page1.locator('.ProseMirror');
  const editor2 = page2.locator('.ProseMirror');
  
  await editor1.click();
  await editor1.type('User1이 작성한 내용');
  
  await editor2.click();
  await editor2.type('User2가 작성한 내용');
  
  // 각 사용자의 변경사항이 상대방에게 표시되는지 확인
  await expect(editor1.locator('text=User2가 작성한 내용')).toBeVisible({ timeout: 5000 });
  await expect(editor2.locator('text=User1이 작성한 내용')).toBeVisible({ timeout: 5000 });
  
  await context1.close();
  await context2.close();
});
```

**시나리오 2: 사용자 프레젠스 표시**
```typescript
test('현재 편집 중인 사용자가 프레젠스로 표시된다', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  await loginUser(page1, 'user1@example.com');
  await loginUser(page2, 'user2@example.com');
  
  const doc = await createDocument(page1, '프레젠스 테스트');
  await shareDocument(page1, doc.id, 'user2@example.com', 'WRITE');
  
  await page2.goto(`/${doc.id}-프레젠스-테스트`);
  
  // user2가 편집 시작
  await page2.locator('.ProseMirror').click();
  
  // user1의 화면에 user2의 프레젠스 표시 확인
  await expect(page1.locator('[data-presence="user2@example.com"]')).toBeVisible();
  
  // user2의 커서 위치 표시 확인
  await expect(page1.locator('.collaborator-cursor')).toBeVisible();
  
  await context1.close();
  await context2.close();
});
```

**시나리오 3: 충돌 해결**
```typescript
test('동시 편집 시 충돌이 올바르게 해결된다', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  await loginUser(page1, 'user1@example.com');
  await loginUser(page2, 'user2@example.com');
  
  const doc = await createDocument(page1, '충돌 테스트');
  await shareDocument(page1, doc.id, 'user2@example.com', 'WRITE');
  
  await page2.goto(`/${doc.id}-충돌-테스트`);
  
  const editor1 = page1.locator('.ProseMirror');
  const editor2 = page2.locator('.ProseMirror');
  
  // 두 사용자가 같은 위치에 동시에 입력
  await editor1.click();
  await editor1.type('A');
  
  await editor2.click();
  await editor2.type('B');
  
  // 두 입력이 모두 반영되는지 확인 (Operational Transformation)
  await page1.waitForTimeout(2000);
  await page2.waitForTimeout(2000);
  
  const content1 = await editor1.textContent();
  const content2 = await editor2.textContent();
  
  // 두 에디터의 내용이 동기화되었는지 확인
  expect(content1).toBe(content2);
  expect(content1).toContain('A');
  expect(content1).toContain('B');
  
  await context1.close();
  await context2.close();
});
```

#### 7.3 테스트 헬퍼 함수
**테스트 파일**: `playwright/helpers.ts`

```typescript
import { Page } from '@playwright/test';

export async function loginUser(
  page: Page,
  email: string = 'test@example.com',
  password: string = 'password123'
) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(\d+)-/, { timeout: 10000 });
}

export async function createDocument(page: Page, title: string) {
  await page.click('button:has-text("새 문서")');
  await page.fill('input[placeholder="제목 없음"]', title);
  await page.press('input[placeholder="제목 없음"]', 'Enter');
  await page.waitForURL(/\/(\d+)-/, { timeout: 5000 });
  
  const url = page.url();
  const match = url.match(/\/(\d+)-/);
  const id = match ? parseInt(match[1]) : null;
  
  return { id, title };
}

export async function createFolder(page: Page, name: string) {
  await page.click('[aria-label="폴더 추가"]');
  await page.fill('input[placeholder="폴더 이름"]', name);
  await page.click('button:has-text("생성")');
  
  return { name };
}

export async function shareDocument(
  page: Page,
  documentId: number,
  email: string,
  permission: 'READ' | 'WRITE'
) {
  await page.click('[aria-label="공유"]');
  await page.fill('input[placeholder="이메일 입력"]', email);
  await page.selectOption('select[name="permission"]', permission);
  await page.click('button:has-text("공유")');
  await page.waitForSelector('text=/공유되었습니다/', { timeout: 5000 });
}
```

#### 7.4 Playwright 설정
**설정 파일**: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'cd frontend && pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

**체크리스트:**
- [ ] 주요 사용자 플로우 E2E 테스트 작성 (6개 파일)
  - [ ] `auth-flow.spec.ts` - 인증 플로우 (3개 테스트)
  - [ ] `workspace-document-creation.spec.ts` - 워크스페이스/문서 생성 (3개 테스트)
  - [ ] `document-editing.spec.ts` - 문서 편집 (3개 테스트)
  - [ ] `document-sharing.spec.ts` - 문서 공유 및 권한 (2개 테스트)
  - [ ] `table-view.spec.ts` - 테이블 뷰 기능 (3개 테스트)
  - [ ] `document-deletion.spec.ts` - 문서 삭제 및 복구 (3개 테스트)
- [ ] 실시간 협업 E2E 테스트 작성 (1개 파일)
  - [ ] `collaboration.spec.ts` - 실시간 협업 (3개 테스트)
- [ ] 테스트 헬퍼 함수 작성
  - [ ] `helpers.ts` - 공통 헬퍼 함수
- [ ] Playwright 설정 파일 작성
  - [ ] `playwright.config.ts` - E2E 테스트 설정
- [ ] CI/CD에 E2E 테스트 통합
  - [ ] GitHub Actions 워크플로우 업데이트
  - [ ] 테스트 결과 리포트 업로드

#### 7.5 테스트 실행 전략

**로컬 실행:**
```bash
# 모든 E2E 테스트 실행
cd frontend && pnpm test:e2e

# 특정 테스트 파일만 실행
pnpm exec playwright test playwright/auth-flow.spec.ts

# UI 모드로 실행 (디버깅)
pnpm exec playwright test --ui

# 특정 브라우저만 실행
pnpm exec playwright test --project=chromium

# 헤드리스 모드 비활성화 (브라우저 창 표시)
pnpm exec playwright test --headed
```

**CI/CD 실행:**
- 모든 테스트는 헤드리스 모드로 실행
- 실패 시 자동 재시도 (최대 2회)
- 스크린샷 및 트레이스 자동 저장
- 테스트 결과를 GitHub Actions 아티팩트로 업로드

#### 7.6 테스트 데이터 관리

**테스트 사용자 계정:**
- `test@example.com` / `password123` - 기본 테스트 사용자
- `user1@example.com` / `password123` - 협업 테스트용 사용자 1
- `user2@example.com` / `password123` - 협업 테스트용 사용자 2
- `owner@example.com` / `password123` - 권한 테스트용 소유자
- `collaborator@example.com` / `password123` - 권한 테스트용 협업자

**데이터 정리:**
- 각 테스트는 독립적으로 실행 가능해야 함
- `beforeEach`에서 필요한 데이터 생성
- `afterEach`에서 테스트 데이터 정리 (선택사항)
- CI에서는 전체 데이터베이스 리셋 사용 권장

#### 7.7 주의사항 및 베스트 프랙티스

**타이밍 이슈:**
- `waitFor`, `waitForURL` 등을 사용하여 비동기 작업 대기
- `page.waitForTimeout()`은 최후의 수단으로만 사용
- 네트워크 요청 완료 대기: `page.waitForResponse()`

**안정성 향상:**
- 명확한 셀렉터 사용 (data-testid 권장)
- 플레이키 테스트 방지: 충분한 대기 시간과 재시도 로직
- 격리된 테스트: 각 테스트는 독립적으로 실행 가능해야 함

**성능 최적화:**
- 병렬 실행 가능한 테스트는 `fullyParallel: true` 활용
- CI에서는 `workers: 1`로 순차 실행하여 안정성 확보
- 불필요한 대기 시간 제거

**디버깅:**
- `--debug` 모드로 단계별 실행
- `--trace on`으로 실행 추적 저장
- 실패한 테스트의 스크린샷 및 비디오 확인

---

## 테스트 작성 가이드

### Vitest 기본 설정

**`vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**`src/setupTests.ts`:**
```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { server } from './mocks/server';

// MSW 서버 시작
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// 각 테스트 후 정리
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// 모든 테스트 후 서버 종료
afterAll(() => server.close());
```

### MSW 핸들러 예시

**`src/mocks/handlers.ts`:**
```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // 문서 목록 조회
  http.get('/api/documents', () => {
    return HttpResponse.json({
      documents: [
        { id: 1, title: '문서 1', content: '내용 1' },
        { id: 2, title: '문서 2', content: '내용 2' },
      ],
    });
  }),

  // 문서 생성
  http.post('/api/documents', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 3,
      ...body,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  // 문서 수정
  http.put('/api/documents/:id', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: params.id,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  // 문서 삭제
  http.delete('/api/documents/:id', () => {
    return HttpResponse.json({}, { status: 204 });
  }),
];
```

**`src/mocks/server.ts`:**
```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### 단위 테스트 예시

**유틸리티 함수 테스트:**
```typescript
import { describe, it, expect } from 'vitest';
import { hasWritePermission } from '@/utils/permissionUtils';

describe('permissionUtils', () => {
  describe('hasWritePermission', () => {
    it('소유자는 쓰기 권한이 있다', () => {
      const document = { ownerId: 1, permissions: [] };
      const user = { id: 1 };
      
      expect(hasWritePermission(document, user)).toBe(true);
    });

    it('쓰기 권한이 있는 사용자는 쓰기 가능하다', () => {
      const document = {
        ownerId: 2,
        permissions: [{ userId: 1, type: 'WRITE' }],
      };
      const user = { id: 1 };
      
      expect(hasWritePermission(document, user)).toBe(true);
    });

    it('권한이 없는 사용자는 쓰기 불가능하다', () => {
      const document = { ownerId: 2, permissions: [] };
      const user = { id: 1 };
      
      expect(hasWritePermission(document, user)).toBe(false);
    });
  });
});
```

**커스텀 훅 테스트:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  it('값 변경 후 지정된 시간만큼 지연된다', async () => {
    vi.useFakeTimers();
    
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated' });
    expect(result.current).toBe('initial'); // 아직 업데이트 안됨

    vi.advanceTimersByTime(500);
    await waitFor(() => {
      expect(result.current).toBe('updated');
    });

    vi.useRealTimers();
  });
});
```

**Zustand 스토어 테스트:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '@/stores/authStore';

describe('authStore', () => {
  beforeEach(() => {
    // 스토어 초기화
    useAuthStore.getState().reset();
  });

  it('초기 상태는 null이다', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('로그인 시 사용자 정보가 저장된다', () => {
    const { result } = renderHook(() => useAuthStore());
    
    act(() => {
      result.current.login({ id: 1, email: 'test@example.com' });
    });

    expect(result.current.user).toEqual({ id: 1, email: 'test@example.com' });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('로그아웃 시 사용자 정보가 제거된다', () => {
    const { result } = renderHook(() => useAuthStore());
    
    act(() => {
      result.current.login({ id: 1, email: 'test@example.com' });
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

### 통합 테스트 예시

**React Query + MSW 통합 테스트:**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentList } from '@/components/documents/DocumentList';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';

describe('DocumentList 통합 테스트', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  it('문서 목록을 불러와서 표시한다', async () => {
    server.use(
      http.get('/api/documents', () => {
        return HttpResponse.json({
          documents: [
            { id: 1, title: '문서 1' },
            { id: 2, title: '문서 2' },
          ],
        });
      })
    );

    render(
      <QueryClientProvider client={queryClient}>
        <DocumentList />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('문서 1')).toBeInTheDocument();
      expect(screen.getByText('문서 2')).toBeInTheDocument();
    });
  });

  it('문서 생성 후 목록이 갱신된다', async () => {
    const { user } = await import('@testing-library/user-event');
    const userEvent = user.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <DocumentList />
      </QueryClientProvider>
    );

    const createButton = screen.getByRole('button', { name: /생성/ });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('새 문서')).toBeInTheDocument();
    });
  });
});
```

**컴포넌트 + Context 통합 테스트:**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkspaceList } from '@/components/workspace/WorkspaceList';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { AuthProvider } from '@/contexts/AuthContext';

describe('WorkspaceList 통합 테스트', () => {
  it('워크스페이스 목록을 표시한다', () => {
    const mockWorkspaces = [
      { id: 1, name: '워크스페이스 1' },
      { id: 2, name: '워크스페이스 2' },
    ];

    render(
      <AuthProvider>
        <WorkspaceProvider>
          <WorkspaceList />
        </WorkspaceProvider>
      </AuthProvider>
    );

    expect(screen.getByText('워크스페이스 1')).toBeInTheDocument();
    expect(screen.getByText('워크스페이스 2')).toBeInTheDocument();
  });
});
```

### E2E 테스트 예시 (Playwright)

**`playwright/document-crud.spec.ts`:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('문서 CRUD 플로우', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('문서를 생성할 수 있다', async ({ page }) => {
    await page.click('button:has-text("새 문서")');
    await page.fill('input[placeholder="제목 없음"]', '테스트 문서');
    await page.press('input[placeholder="제목 없음"]', 'Enter');

    await expect(page.locator('text=테스트 문서')).toBeVisible();
  });

  test('문서를 수정할 수 있다', async ({ page }) => {
    await page.click('text=테스트 문서');
    await page.fill('.editor-content', '수정된 내용');
    await page.click('button:has-text("저장")');

    await expect(page.locator('text=수정된 내용')).toBeVisible();
  });

  test('문서를 삭제할 수 있다', async ({ page }) => {
    await page.click('text=테스트 문서');
    await page.click('button[aria-label="삭제"]');
    await page.click('button:has-text("확인")');

    await expect(page.locator('text=테스트 문서')).not.toBeVisible();
  });
});
```

---

## CI/CD 통합

### GitHub Actions 워크플로우

**`.github/workflows/test.yml`:**
```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9.15.0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run unit tests
        run: pnpm test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unit

  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9.15.0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        working-directory: ./frontend
        run: pnpm install --frozen-lockfile
      
      - name: Install Playwright browsers
        working-directory: ./frontend
        run: pnpm exec playwright install --with-deps chromium
      
      - name: Start backend services
        run: |
          docker compose -f docker-compose.dev.yml up -d db
          docker compose -f docker-compose.dev.yml up -d backend
          # 백엔드가 준비될 때까지 대기
          timeout 120 bash -c 'until curl -f http://localhost:8080/actuator/health; do sleep 2; done'
      
      - name: Run E2E tests
        working-directory: ./frontend
        run: pnpm test:e2e
        env:
          CI: true
          BASE_URL: http://localhost:5173
          API_URL: http://localhost:8080
      
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 30
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-results
          path: frontend/playwright-report/results.json
          retention-days: 7
      
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-screenshots
          path: frontend/test-results/
          retention-days: 7
      
      - name: Cleanup
        if: always()
        run: docker compose -f docker-compose.dev.yml down
```

---

## 테스트 커버리지 목표

### 단계별 목표

| Phase | 단위 테스트 | 통합 테스트 | E2E 테스트 | 상태 |
|-------|------------|------------|-----------|------|
| Phase 1 | - | - | - | ✅ 완료 |
| Phase 2 | 18.07%* | - | - | ✅ 완료 |
| Phase 3 | 70% | 50% | - | 🔄 진행 예정 |
| Phase 4 | 75% | 60% | - | 🔄 진행 예정 |
| Phase 5 | 80% | 70% | 30% | 🔄 진행 예정 |
| Phase 6 | 85% | 75% | 50% | 🔄 진행 예정 |
| Phase 7 | 85% | 75% | 70% | 🔄 진행 예정 |

*전체 코드 기준 커버리지. 유틸리티/훅 영역은 높은 커버리지 달성

### 최종 목표
- **단위 테스트**: 85% 이상
- **통합 테스트**: 75% 이상
- **E2E 테스트**: 주요 플로우 100% 커버

---

## 모니터링 및 유지보수

### 테스트 실행 빈도
- **로컬 개발**: 변경사항마다 watch 모드로 실행
- **커밋 전**: `pnpm test` 실행 (필수)
- **PR 전**: 전체 테스트 스위트 실행
- **CI/CD**: 모든 브랜치 푸시 시 자동 실행

### 테스트 리팩토링
- 테스트 코드도 프로덕션 코드와 동일한 품질 유지
- 중복 코드는 헬퍼 함수로 추출
- 테스트 데이터는 `src/mocks/` 디렉토리에 관리

### 테스트 실패 대응
- 실패한 테스트는 즉시 수정
- 플레이키 테스트는 재작성
- CI에서 실패 시 PR 머지 차단

---

## 참고 자료

### 공식 문서
- [Vitest 공식 문서](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [MSW 공식 문서](https://mswjs.io/)
- [Playwright 공식 문서](https://playwright.dev/)

### 베스트 프랙티스
- [Testing Library 사용 가이드](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Vitest 마이그레이션 가이드](https://vitest.dev/guide/migration.html)

---

## 체크리스트 요약

### Phase 1: 환경 구축 ✅ 완료
- [x] Vitest 설치 및 설정
- [x] MSW 설치 및 설정
- [x] 테스트 스크립트 추가
- [x] 기존 Jest 테스트 마이그레이션 (WorkspaceList.test.tsx)
- [x] CI/CD 파이프라인 설정 (.github/workflows/test.yml)

**완료일**: 2025-12-31  
**테스트 파일**: 1개 (WorkspaceList.test.tsx - 7개 테스트)

### Phase 2: 핵심 유틸리티 ✅ 완료
- [x] 유틸리티 함수 테스트 (5개)
  - [x] `src/lib/utils.test.ts` (cn, slugify, formatKoreanDateTime 등)
  - [x] `src/lib/colors.test.ts` (TAG_COLORS, getColorObj)
  - [x] `src/utils/permissionUtils.test.ts` (권한 체크 로직)
  - [x] `src/lib/errorUtils.test.ts` (에러 처리 유틸리티)
  - [x] `src/utils/authSync.test.ts` (인증 동기화)
- [x] 커스텀 훅 테스트 (5개)
  - [x] `src/hooks/useDebounce.test.ts` (디바운스 로직)
  - [x] `src/hooks/useThrottle.test.ts` (쓰로틀 로직)
  - [x] `src/hooks/useErrorHandler.test.ts` (에러 핸들링)
  - [x] `src/hooks/useToast.test.ts` (Toast 알림)
  - [x] `src/hooks/useWorkspacePermissions.test.ts` (권한 체크)
- [ ] 커버리지 60% 달성 (현재: 18.07% - 전체 코드 기준, 유틸리티/훅 영역은 높은 커버리지)

**완료일**: 2025-12-31  
**테스트 파일**: 11개 (총 156개 테스트, 모두 통과)  
**주요 성과**: 
- 모든 유틸리티 함수와 커스텀 훅에 대한 단위 테스트 완료
- MSW를 활용한 API 모킹 설정 완료
- React Query 통합 테스트 예시 작성

### Phase 3: 스토어 및 서비스
- [ ] Zustand 스토어 테스트 (5개)
- [ ] API 서비스 테스트 (5개)
- [ ] MSW 핸들러 작성

### Phase 4: UI 컴포넌트
- [ ] 공통 UI 컴포넌트 테스트 (7개)
- [ ] 레이아웃 컴포넌트 테스트 (4개)
- [ ] 인증 컴포넌트 테스트 (3개)

### Phase 5: 문서 컴포넌트
- [ ] 문서 편집기 테스트 (4개)
- [ ] 문서 뷰 테스트 (3개)
- [ ] 문서 속성 테스트 (3개)

### Phase 6: 고급 기능
- [ ] 테이블 뷰 고급 기능 테스트
- [ ] 권한 관리 컴포넌트 테스트
- [ ] 설정 컴포넌트 테스트

### Phase 7: E2E 테스트
- [ ] 주요 사용자 플로우 E2E 테스트 작성 (6개 파일, 17개 테스트)
  - [ ] `auth-flow.spec.ts` - 인증 플로우 (3개 테스트)
    - [ ] 회원가입 및 첫 로그인
    - [ ] 로그인 실패 처리
    - [ ] 로그아웃
  - [ ] `workspace-document-creation.spec.ts` - 워크스페이스/문서 생성 (3개 테스트)
    - [ ] 워크스페이스 생성
    - [ ] 문서 생성
    - [ ] 문서를 폴더로 이동 (DnD)
  - [ ] `document-editing.spec.ts` - 문서 편집 (3개 테스트)
    - [ ] 문서 내용 편집 및 자동 저장
    - [ ] 문서 제목 변경
    - [ ] TipTap 에디터 포맷팅 기능
  - [ ] `document-sharing.spec.ts` - 문서 공유 및 권한 (2개 테스트)
    - [ ] 문서 공유 및 읽기 권한 부여
    - [ ] 권한 변경
  - [ ] `table-view.spec.ts` - 테이블 뷰 기능 (3개 테스트)
    - [ ] 테이블 뷰로 전환 및 필터링
    - [ ] 테이블 뷰 정렬
    - [ ] 테이블 뷰 행 DnD 및 다중 선택 삭제
  - [ ] `document-deletion.spec.ts` - 문서 삭제 및 복구 (3개 테스트)
    - [ ] 문서 삭제
    - [ ] 문서 복구
    - [ ] 영구 삭제
- [ ] 실시간 협업 E2E 테스트 작성 (1개 파일, 3개 테스트)
  - [ ] `collaboration.spec.ts` - 실시간 협업
    - [ ] 다중 사용자 동시 편집
    - [ ] 사용자 프레젠스 표시
    - [ ] 충돌 해결
- [ ] 테스트 인프라 구축
  - [ ] `helpers.ts` - 공통 헬퍼 함수 작성
  - [ ] `playwright.config.ts` - E2E 테스트 설정 완료
  - [ ] 테스트 데이터 관리 전략 수립
- [ ] CI/CD 통합
  - [ ] GitHub Actions 워크플로우에 E2E 테스트 추가
  - [ ] 테스트 결과 리포트 업로드 설정
  - [ ] 실패 시 스크린샷 및 트레이스 저장 설정
