# Frontend Developer Skill

Notion Clone 프로젝트의 **프론트엔드 개발 작업**을 효율적으로 수행하기 위한 Claude Code 스킬입니다.

## 스킬 구성

```
frontend-developer/
├── SKILL.md              # 스킬 메타데이터 및 설명
├── BEST-PRACTICES.md     # 개발 베스트 프랙티스 가이드
├── README.md             # 이 파일
└── templates/
    ├── component-template.jsx  # React 컴포넌트 템플릿
    └── hook-template.js        # 커스텀 훅 템플릿
```

## 스킬 활성화 방법

이 스킬은 **자동으로 활성화**됩니다. 다음과 같이 프론트엔드 개발 작업을 요청하면 Claude Code가 자동으로 이 스킬을 사용합니다:

### 자동 활성화 예시

```
# 컴포넌트 개발
"반응형 네비게이션 컴포넌트 만들어줘"
"문서 검색 폼을 구현해줄래?"

# UI 이슈 해결
"이 버튼 스타일이 좀 이상한데 수정해줄 수 있어?"
"다크모드 지원을 추가해줘"

# 성능 최적화
"이 컴포넌트 렌더링 성능을 최적화해줄 수 있을까?"
"번들 사이즈를 줄일 수 있는 방법을 찾아줘"

# 에러 처리
"API 호출 에러 처리를 개선해줄래?"
"WebSocket 연결 에러를 처리해야 해"

# 테스트
"이 컴포넌트의 테스트를 작성해줄래?"

# 접근성 개선
"접근성을 개선해줄 수 있어?"
"키보드 네비게이션 지원을 추가해줘"
```

## 사용 가능한 도구

스킬에서 사용할 수 있는 도구들:

- **Read**: 파일 읽기
- **Edit**: 파일 편집
- **Grep**: 코드 검색
- **Glob**: 파일 패턴 검색
- **Bash**: 명령어 실행 (개발 서버 시작 등)

## 스킬이 할 수 있는 작업

### 1. React 컴포넌트 개발
- 함수형 컴포넌트 작성
- React Hooks 활용 (useState, useEffect, useContext 등)
- 커스텀 훅 개발

### 2. 스타일링
- Tailwind CSS를 사용한 반응형 디자인
- 다크모드 지원
- shadcn/ui 컴포넌트 활용

### 3. 상태 관리
- React Context를 통한 전역 상태 관리
- Zustand를 사용한 복잡한 상태 관리
- Custom Hooks로 비즈니스 로직 캡슐화

### 4. API 통신
- REST API 호출 및 에러 처리
- WebSocket(STOMP) 실시간 통신
- 로딩/에러 상태 관리

### 5. 성능 최적화
- useMemo, useCallback을 통한 최적화
- 번들 사이즈 분석
- 렌더링 성능 개선

### 6. 접근성(A11y)
- 시맨틱 HTML 마크업
- ARIA 속성 추가
- 키보드 네비게이션 구현

### 7. 에러 처리 및 디버깅
- 에러 바운더리 구현
- 에러 로깅 및 처리
- React DevTools 활용

### 8. 테스트 작성
- React Testing Library를 사용한 컴포넌트 테스트
- Mock 데이터 및 핸들러 작성

## 프론트엔드 프로젝트 구조

```
frontend/
├── src/
│   ├── App.jsx
│   ├── components/
│   │   ├── layout/        # 레이아웃 (사이드바, 헤더 등)
│   │   ├── auth/          # 인증 컴포넌트
│   │   ├── documents/     # 문서 관련 컴포넌트
│   │   ├── editor/        # 에디터 (TipTap)
│   │   ├── workspace/     # 워크스페이스 컴포넌트
│   │   ├── notifications/ # 알림 시스템
│   │   ├── error/         # 에러 바운더리
│   │   └── ui/            # shadcn/ui 컴포넌트
│   ├── contexts/          # React Context
│   ├── hooks/             # 커스텀 훅
│   ├── services/          # API 호출 서비스
│   ├── lib/               # 유틸리티 함수
│   └── styles/            # 글로벌 스타일
├── package.json
└── vite.config.js
```

## 개발 명령어 모음

### 기본 명령어

```bash
# 프론트엔드 디렉토리로 이동
cd frontend

# 의존성 설치
pnpm install

# 개발 서버 시작 (http://localhost:5173)
pnpm dev

# 빌드
pnpm build

# 린트 실행
pnpm lint

# 프로덕션 빌드 미리보기
pnpm preview
```

### 백엔드와 함께 실행

```bash
# 백엔드 시작 (별도 터미널)
cd backend
./gradlew bootRun

# 프론트엔드 시작
cd frontend
pnpm dev
```

### Docker로 실행

```bash
# 개발 모드 (핫 리로드)
docker compose -f docker-compose.dev.yml up --build

# 프로덕션 모드
docker compose up --build -d
```

## 주요 패턴 및 컨벤션

### 1. Import 경로
```javascript
// ✅ @ 별칭 사용
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
```

### 2. 컴포넌트 구조
```javascript
export function MyComponent({ prop1, prop2 = 'default' }) {
  const [state, setState] = useState(null);

  const handleClick = useCallback(() => {
    // 로직
  }, []);

  useEffect(() => {
    // 초기화 로직
  }, []);

  return <div>{/* JSX */}</div>;
}
```

### 3. Context 패턴
```javascript
const Context = createContext();

export function Provider({ children }) {
  const [state, setState] = useState();
  return <Context.Provider value={{ state, setState }}>{children}</Context.Provider>;
}

export function useContext() {
  const context = useContext(Context);
  if (!context) throw new Error('Provider not found');
  return context;
}
```

### 4. Custom Hook 패턴
```javascript
export function useCustomHook(param) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 로직
  }, [param]);

  return { data, loading, error };
}
```

## 템플릿 사용하기

스킬에 포함된 템플릿을 참고하세요:

- **component-template.jsx**: React 컴포넌트 작성 템플릿
- **hook-template.js**: 커스텀 훅 작성 템플릿

## 유용한 리소스

### 프로젝트 문서
- `CLAUDE.md` - 프로젝트 개요 및 아키텍처
- `README.md` - 프로젝트 설명

### 라이브러리 문서
- [React 공식 문서](https://react.dev)
- [Tailwind CSS 문서](https://tailwindcss.com)
- [shadcn/ui 문서](https://ui.shadcn.com)
- [TipTap 에디터 문서](https://tiptap.dev)
- [Zustand 문서](https://github.com/pmndrs/zustand)

## 팀과 스킬 공유

이 스킬은 `.claude/skills/frontend-developer/` 디렉토리에 저장되어 있습니다:

1. 변경사항을 git에 커밋합니다
2. 팀원이 pull하면 자동으로 스킬을 사용할 수 있습니다
3. 스킬을 업데이트하면 모든 팀원이 최신 버전을 사용합니다

## 예시 작업 시나리오

### 시나리오 1: 새로운 컴포넌트 만들기

```
사용자: "문서 목록을 보여주는 컴포넌트를 만들어줄래? 검색과 필터링 기능도 포함해줘"

Claude Code가 자동으로:
1. 기존 컴포넌트 구조 분석
2. 필요한 API 호출 메커니즘 확인
3. 상태 관리 방식 결정
4. Tailwind CSS로 스타일링
5. 테스트 코드 작성
```

### 시나리오 2: 성능 최적화

```
사용자: "이 컴포넌트가 너무 많이 리렌더링돼. 성능을 최적화해줄 수 있어?"

Claude Code가 자동으로:
1. 컴포넌트 렌더링 패턴 분석
2. useMemo, useCallback 최적화 제안
3. React.memo 적용
4. 불필요한 state 제거
```

### 시나리오 3: 에러 처리 개선

```
사용자: "API 호출 에러를 더 잘 처리하고 싶어. 사용자 친화적인 에러 메시지를 보여줘"

Claude Code가 자동으로:
1. 현재 API 호출 방식 검토
2. 에러 타입별 처리 로직 추가
3. 사용자 친화적인 메시지 구현
4. 에러 로깅 추가
```

## 주의사항

1. **의존성**: 항상 프로젝트의 `package.json`을 확인하고 필요한 라이브러리를 사용하세요
2. **환경 변수**: `.env` 파일의 설정을 확인하고 올바른 API 엔드포인트를 사용하세요
3. **성능**: 큰 리스트는 가상화(virtualization)를 고려하세요
4. **테스트**: 중요한 컴포넌트는 테스트 코드를 작성하세요
5. **접근성**: 모든 인터랙티브 요소에 적절한 ARIA 속성을 추가하세요

## 피드백

스킬을 개선하기 위한 피드백은 `.cursor/rules/memory-bank/progress.md`에 기록해주세요.
