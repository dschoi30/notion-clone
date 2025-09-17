# Frontend Architecture Structure

## App.jsx 리팩토링 후 컴포넌트 구조
```
frontend/src/
├── App.jsx (59줄 - 핵심 구조만)
│   ├── Root (ErrorBoundary)
│   │   └── AuthProvider
│   │       └── App (Router)
│   │           └── AppContent
│   │               ├── NotificationProvider (user가 있을 때)
│   │               │   └── WorkspaceProvider
│   │               │       └── DocumentProvider
│   │               │           └── MainLayout
│   │               │               ├── Sidebar
│   │               │               ├── AppRouter
│   │               │               │   ├── Routes
│   │               │               │   │   ├── "/" → Navigate to defaultPath
│   │               │               │   │   └── "/:idSlug" → DocumentEditor
│   │               │               │   └── URL 검증 및 리다이렉트 로직
│   │               │               └── Toaster
│   │               └── AuthRouter (user가 없을 때)
│   │                   ├── Routes
│   │                   │   ├── "/login" → LoginForm
│   │                   │   ├── "/register" → RegisterForm
│   │                   │   └── "*" → Navigate to "/login"
│   │                   └── 인증되지 않은 사용자용 레이아웃
└── components/layout/
    ├── AppRouter.jsx (라우팅 로직)
    ├── AuthRouter.jsx (인증 라우팅)
    └── MainLayout.jsx (메인 레이아웃)
```

## 컴포넌트 분리 상세

### 1. App.jsx (핵심 구조)
- **역할**: 최상위 라우터 설정 및 Provider 계층 구성
- **크기**: 59줄 (기존 204줄에서 대폭 축소)
- **책임**: Router 설정, 인증 상태에 따른 라우팅 분기

### 2. AppRouter.jsx (라우팅 로직)
- **역할**: 복잡한 URL 검증 및 리다이렉트 처리
- **주요 기능**:
  - URL에서 문서 ID 추출
  - 문서 경로 계산 및 네비게이션
  - 워크스페이스/문서 목록 변경 시 URL 검증
  - localStorage 기반 마지막 문서 복원

### 3. AuthRouter.jsx (인증 라우팅)
- **역할**: 로그인/회원가입 페이지 라우팅
- **주요 기능**:
  - 로그인 페이지 라우팅
  - 회원가입 페이지 라우팅
  - 인증되지 않은 사용자 리다이렉트

### 4. MainLayout.jsx (메인 레이아웃)
- **역할**: 사이드바와 메인 콘텐츠 영역 구성
- **주요 기능**:
  - Sidebar 컴포넌트 포함
  - AppRouter 렌더링
  - Toast 알림 시스템

## 에러 처리 시스템 구조
```
frontend/src/
├── components/error/
│   ├── ErrorBoundary.jsx (React Error Boundary)
│   └── ErrorMessage.jsx (에러 메시지 UI 컴포넌트)
├── hooks/
│   └── useErrorHandler.js (에러 처리 훅)
├── lib/
│   └── errorUtils.js (에러 유틸리티 함수)
└── services/
    └── api.js (API 인터셉터 - 토큰 만료 처리)
```

## 토큰 만료 처리 플로우
```
API 요청 → 403/401 에러 → API 인터셉터 → 토큰 정리 → 로그인 페이지 리다이렉트
```
