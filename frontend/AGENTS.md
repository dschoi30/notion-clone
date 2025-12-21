# Frontend Module - AI Agent Rules

## Module Context

프론트엔드는 Vite + React 기반의 SPA(Single Page Application)입니다. 실시간 협업 문서 편집, 테이블/갤러리 뷰, 드래그 앤 드롭, 권한 관리 등의 기능을 제공합니다.

### Dependencies
- React 18.3.1
- Vite 5.4.19
- shadcn/ui (Radix UI 기반)
- Zustand 4.5.2 (클라이언트 상태)
- React Query 5.90.10 (서버 상태)
- TipTap 2.11.9 (리치 텍스트 에디터)
- dnd-kit 6.3.1 (드래그 앤 드롭)
- Tailwind CSS 3.4.10
- Axios 1.6.7 (HTTP 클라이언트)

### Key Directories
- `src/components/`: 재사용 가능한 UI 컴포넌트
- `src/contexts/`: React Context (Auth, Document, Workspace, Notification)
- `src/stores/`: Zustand 스토어
- `src/hooks/`: 커스텀 훅
- `src/services/`: API 클라이언트
- `src/utils/`: 유틸리티 함수

## Tech Stack & Constraints

### State Management
- **클라이언트 상태**: Zustand 사용 (authStore, documentStore, uiStore, workspaceStore)
- **서버 상태**: React Query 사용 (모든 API 호출)
- **Context API**: 인증, 문서, 워크스페이스, 알림 컨텍스트 (React Query와 통합)

### UI Framework
- **shadcn/ui**: 모든 UI 컴포넌트는 shadcn/ui 기반
- **Tailwind CSS**: 유틸리티 클래스 기반 스타일링
- **커스텀 컴포넌트**: `src/components/ui/`에 shadcn/ui 컴포넌트 확장

### Editor
- **TipTap**: 리치 텍스트 에디터
- **확장**: `src/components/editor/extensions/`에 커스텀 확장 추가
- **BlockDragHandle**: 블록 단위 드래그 앤 드롭 지원

### Drag and Drop
- **dnd-kit**: 모든 드래그 앤 드롭 기능
- **사용 위치**: 문서 목록, 테이블 헤더, 테이블 행, 에디터 블록

## Implementation Patterns

### Component Structure
```jsx
// 컴포넌트 기본 구조
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ComponentName');

export const ComponentName = ({ prop1, prop2 }) => {
  // 상태 관리
  // React Query 훅
  // 이벤트 핸들러
  
  return (
    // JSX
  );
};
```

### React Query Pattern
```jsx
// 데이터 조회
const { data, isLoading, error } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => api.getResource(id),
  enabled: !!id,
  retry: 1,
});

// 데이터 변경
const mutation = useMutation({
  mutationFn: (data) => api.updateResource(id, data),
  onSuccess: () => {
    queryClient.invalidateQueries(['resource', id]);
    toast.success('성공적으로 업데이트되었습니다.');
  },
});
```

### Zustand Store Pattern
```jsx
// 스토어 정의
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set) => ({
      state: null,
      setState: (newState) => set({ state: newState }),
    }),
    { name: 'store-storage' }
  )
);
```

### Error Handling
```jsx
// useErrorHandler 훅 사용
import { useErrorHandler } from '@/hooks/useErrorHandler';

const { handleError } = useErrorHandler();

try {
  await api.call();
} catch (error) {
  handleError(error);
}
```

### Logging
```jsx
// logger.js 사용 (console.log 대신)
import { createLogger } from '@/lib/logger';

const logger = createLogger('ComponentName');

logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);
```

## Testing Strategy

### Unit Tests
```bash
# Jest + React Testing Library
pnpm test

# 특정 파일 테스트
pnpm test ComponentName.test.jsx
```

### E2E Tests
```bash
# Playwright
pnpm test:e2e

# 특정 스펙 실행
pnpm test:e2e ws-403.spec.ts
```

### Test File Location
- 단위 테스트: 컴포넌트와 같은 디렉토리 (`ComponentName.test.jsx`)
- E2E 테스트: `playwright/` 디렉토리

## Local Golden Rules

### Do's
- 컴포넌트는 단일 책임 원칙 준수
- props는 명확한 타입과 기본값 제공
- 커스텀 훅으로 로직 재사용
- React Query로 서버 상태 관리
- Zustand로 클라이언트 전역 상태 관리
- 에러는 ErrorBoundary와 useErrorHandler로 처리
- 로깅은 logger.js 사용
- Toast로 사용자 피드백 제공 (alert 대신)
- Tailwind CSS 유틸리티 클래스 사용
- shadcn/ui 컴포넌트 재사용

### Don'ts
- Context API로 서버 상태 관리하지 않음
- console.log 사용하지 않음
- alert/confirm 사용하지 않음
- 인라인 스타일 남용 지양
- 불필요한 리렌더링 유발하는 패턴 지양
- 직접 DOM 조작 지양
- 하드코딩된 값 사용 지양 (상수 파일 사용)

## File Naming Conventions

- 컴포넌트: PascalCase (`DocumentEditor.jsx`)
- 훅: camelCase with `use` prefix (`useDocumentSocket.js`)
- 유틸: camelCase (`permissionUtils.js`)
- 상수: UPPER_SNAKE_CASE (`zIndex.js`)
- 스토어: camelCase with `Store` suffix (`authStore.js`)

## Common Patterns

### API 호출
```jsx
// services/api.js의 axios 인스턴스 사용
import api from '@/services/api';

const response = await api.get('/documents');
```

### 권한 체크
```jsx
// permissionUtils.js 사용
import { hasWritePermission } from '@/utils/permissionUtils';

const canEdit = hasWritePermission(document, user);
```

### Toast 메시지
```jsx
// useToast 훅 사용
import { useToast } from '@/hooks/useToast';

const { toast } = useToast();

toast({
  variant: 'success',
  title: '성공',
  description: '작업이 완료되었습니다.',
});
```

### 로컬 스토리지
```jsx
// Zustand persist 미들웨어 사용 (권장)
// 또는 직접 localStorage 사용 (필요시)
localStorage.setItem('key', JSON.stringify(value));
const value = JSON.parse(localStorage.getItem('key'));
```

