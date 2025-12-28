# 프론트엔드 테스트 전략 및 마이그레이션 가이드

## 목차
1. [현재 상태 분석](#현재-상태-분석)
2. [테스트 프레임워크 추천](#테스트-프레임워크-추천)
3. [테스트 전략](#테스트-전략)
4. [단계적 마이그레이션 계획](#단계적-마이그레이션-계획)
5. [테스트 작성 가이드](#테스트-작성-가이드)
6. [CI/CD 통합](#cicd-통합)

---

## 현재 상태 분석

### 설치된 테스트 도구
- ✅ **Jest 29.7.0**: 단위 테스트 프레임워크 (설정됨)
- ✅ **React Testing Library 16.3.0**: 컴포넌트 테스트 라이브러리
- ✅ **@testing-library/jest-dom**: DOM 매처 확장
- ✅ **@testing-library/user-event**: 사용자 이벤트 시뮬레이션
- ✅ **Playwright 1.52.0**: E2E 테스트 프레임워크

### 현재 테스트 현황
- 기존 테스트 파일: `WorkspaceList.test.jsx` (1개)
- Jest 설정 파일: `jest.config.cjs` 존재
- E2E 테스트: `playwright/ws-403.spec.ts` 존재

### 문제점
1. **Jest와 Vite의 호환성 이슈**: Vite는 ESM 기반, Jest는 CommonJS 기반
2. **테스트 커버리지 부족**: 대부분의 컴포넌트와 로직에 테스트 없음
3. **API 모킹 부재**: 통합 테스트를 위한 API 모킹 도구 없음
4. **테스트 스크립트 미설정**: `package.json`에 테스트 스크립트 없음

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
- `jest.config.cjs` 제거 (마이그레이션 후)

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
**시나리오:**
1. 사용자 회원가입 및 로그인
2. 워크스페이스 생성 및 문서 생성
3. 문서 편집 및 저장
4. 문서 공유 및 권한 설정
5. 테이블 뷰에서 필터링 및 정렬
6. 문서 삭제 및 복구

#### 7.2 실시간 협업 테스트
**시나리오:**
1. 다중 사용자 동시 편집
2. 사용자 프레젠스 표시
3. 충돌 해결

**체크리스트:**
- [ ] 주요 사용자 플로우 E2E 테스트 작성 (6개)
- [ ] 실시간 협업 E2E 테스트 작성 (3개)
- [ ] CI/CD에 E2E 테스트 통합

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
      
      - name: Install Playwright
        run: pnpm exec playwright install --with-deps
      
      - name: Run E2E tests
        run: pnpm test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 테스트 커버리지 목표

### 단계별 목표

| Phase | 단위 테스트 | 통합 테스트 | E2E 테스트 |
|-------|------------|------------|-----------|
| Phase 1 | - | - | - |
| Phase 2 | 60% | - | - |
| Phase 3 | 70% | 50% | - |
| Phase 4 | 75% | 60% | - |
| Phase 5 | 80% | 70% | 30% |
| Phase 6 | 85% | 75% | 50% |
| Phase 7 | 85% | 75% | 70% |

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

### Phase 1: 환경 구축
- [ ] Vitest 설치 및 설정
- [ ] MSW 설치 및 설정
- [ ] 테스트 스크립트 추가
- [ ] 기존 Jest 테스트 마이그레이션
- [ ] CI/CD 파이프라인 설정

### Phase 2: 핵심 유틸리티
- [ ] 유틸리티 함수 테스트 (5개)
- [ ] 커스텀 훅 테스트 (5개)
- [ ] 커버리지 60% 달성

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
- [ ] 주요 사용자 플로우 테스트 (6개)
- [ ] 실시간 협업 테스트 (3개)
