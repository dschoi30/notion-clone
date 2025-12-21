# Notion Clone - AI Agent Rules

## Project Context & Operations

### Business Goals
Notion Clone은 실시간 협업 문서 플랫폼으로, 사용자들이 문서를 작성, 편집, 공유하고 팀과 협업할 수 있는 웹 애플리케이션입니다. 주요 기능은 문서 관리, 실시간 동시 편집, 테이블/갤러리 뷰, 권한 관리, 버전 관리입니다.

### Tech Stack
- Frontend: Vite + React 18, shadcn/ui, Zustand, TipTap, dnd-kit, React Query, Tailwind CSS
- Backend: Spring Boot 3, Spring Security, Spring Data JPA, WebSocket (STOMP)
- Database: PostgreSQL
- Authentication: JWT with session management
- Infrastructure: Docker, Nginx, Prometheus, Loki, Grafana
- Monitoring: Sentry (optional), Prometheus metrics, structured logging

### Operational Commands

#### Development
```bash
# 전체 개발 환경 시작 (Docker)
docker compose -f docker-compose.dev.yml up --build

# 프론트엔드만 로컬 실행
cd frontend && pnpm install && pnpm dev

# 백엔드만 로컬 실행
cd backend && ./gradlew bootRun

# 프론트엔드 빌드
cd frontend && pnpm build

# 백엔드 빌드
cd backend && ./gradlew build
```

#### Production
```bash
# 운영 환경 시작
docker compose up --build -d

# 로그 확인
docker compose logs -f backend
docker compose logs -f frontend
```

#### Testing
```bash
# 프론트엔드 테스트
cd frontend && pnpm test

# 백엔드 테스트
cd backend && ./gradlew test
```

#### Database
```bash
# DB 접속
docker compose exec db psql -U notion_user -d notion_db

# DB 백업
docker compose exec db pg_dump -U notion_user notion_db > backup.dump
```

## Golden Rules

### Immutable (절대 타협 불가)

1. **Security**
   - JWT 토큰에 민감한 정보(userId 등)를 포함하지 않음
   - 패스워드는 반드시 BCrypt로 해싱하여 저장
   - 인증이 필요한 모든 API는 JWT 검증 필수
   - 프로덕션 환경에서 관리자/더미 데이터 엔드포인트는 반드시 인증 필요
   - SQL Injection 방지: JPA 사용, 네이티브 쿼리 사용 시 파라미터 바인딩 필수

2. **Architecture**
   - 프론트엔드와 백엔드는 완전히 분리된 독립 애플리케이션
   - API 통신은 RESTful 원칙 준수
   - WebSocket은 실시간 협업 기능에만 사용
   - 상태 관리: 전역 상태는 Zustand, 서버 상태는 React Query

3. **Data Integrity**
   - 문서 삭제 시 관련 데이터(속성 값, 버전, 권한)도 함께 정리
   - 트랜잭션 경계 명확히 설정 (@Transactional)
   - 외래 키 제약 조건 준수

### Do's & Don'ts

#### Do's
- 항상 공식 SDK/라이브러리 사용 (shadcn/ui, TipTap, dnd-kit 등)
- 환경 변수로 설정 관리 (.env 파일 사용)
- 에러 처리는 사용자 친화적 메시지와 함께 처리
- 로깅은 구조화된 형식(JSON) 사용, 민감한 정보 마스킹
- 권한 체크는 백엔드와 프론트엔드 모두에서 수행
- React Query를 사용하여 서버 상태 관리
- Zustand를 사용하여 클라이언트 전역 상태 관리
- 컴포넌트는 단일 책임 원칙 준수
- 커스텀 훅으로 로직 재사용

#### Don'ts
- API 키나 비밀번호를 코드에 하드코딩하지 않음
- alert() 대신 toast 시스템 사용
- console.log 대신 logger.js의 createLogger 사용
- Context API로 서버 상태 관리하지 않음 (React Query 사용)
- 불필요한 리렌더링 유발하는 상태 관리 지양
- 직접 DOM 조작 지양 (React 패턴 준수)
- 네이티브 쿼리 남용 지양 (JPA 표준 방식 우선)

## Standards & References

### Coding Conventions

#### Frontend
- 파일명: PascalCase (컴포넌트), camelCase (유틸/훅)
- 컴포넌트: 함수형 컴포넌트, React Hooks 사용
- 스타일링: Tailwind CSS, shadcn/ui 컴포넌트 재사용
- 상태 관리: Zustand (클라이언트), React Query (서버)
- 에러 처리: ErrorBoundary, useErrorHandler 훅
- 로깅: logger.js의 createLogger 사용

#### Backend
- 패키지 구조: domain 기반 (document, user, workspace, permission 등)
- 레이어: Controller → Service → Repository
- 엔티티: JPA Entity, Builder 패턴 사용
- DTO: 요청/응답 분리, 명확한 네이밍
- 예외 처리: @ControllerAdvice로 전역 예외 처리
- 로깅: logback-spring.xml, JSON 형식, MDC 활용

### Git Strategy
- 브랜치 전략: feature/issue-number-description
- 커밋 메시지: Conventional Commits 형식
- PR 전략: 모든 변경사항은 PR을 통해 검토 후 머지

### Commit Message Format
```
type(scope): subject

body (optional)

footer (optional)
```

Types: feat, fix, docs, style, refactor, test, chore

### Maintenance Policy
규칙과 코드의 괴리가 발생하면 즉시 업데이트를 제안하고 적용하라. 모든 변경사항은 progress.md에 기록한다.

## Context Map (Action-Based Routing)

### Frontend
- **[UI 컴포넌트 (shadcn/ui)](./frontend/src/components/ui/AGENTS.md)** — shadcn/ui 컴포넌트 스타일링 및 커스터마이징 시
- **[문서 컴포넌트](./frontend/src/components/documents/AGENTS.md)** — 문서 편집기, 테이블 뷰, 페이지 뷰 작업 시
- **[에디터 확장](./frontend/src/components/editor/AGENTS.md)** — TipTap 에디터 확장 및 커스텀 기능 추가 시
- **[상태 관리 (Zustand)](./frontend/src/stores/AGENTS.md)** — 클라이언트 전역 상태 관리 시
- **[React Query 훅](./frontend/src/hooks/AGENTS.md)** — 서버 상태 관리 및 데이터 페칭 시
- **[커스텀 훅](./frontend/src/hooks/AGENTS.md)** — 재사용 가능한 로직 캡슐화 시
- **[API 클라이언트](./frontend/src/services/AGENTS.md)** — API 호출 로직 및 인터셉터 설정 시

### Backend
- **[API Routes (Controller)](./backend/src/main/java/com/example/notionclone/domain/*/controller/AGENTS.md)** — REST API 엔드포인트 작성 시
- **[비즈니스 로직 (Service)](./backend/src/main/java/com/example/notionclone/domain/*/service/AGENTS.md)** — 비즈니스 로직 구현 시
- **[데이터 접근 (Repository)](./backend/src/main/java/com/example/notionclone/domain/*/repository/AGENTS.md)** — 데이터베이스 쿼리 작성 시
- **[엔티티 모델](./backend/src/main/java/com/example/notionclone/domain/*/entity/AGENTS.md)** — 데이터 모델 설계 및 변경 시
- **[보안 설정](./backend/src/main/java/com/example/notionclone/config/AGENTS.md)** — Spring Security 설정 및 JWT 인증 시
- **[WebSocket 설정](./backend/src/main/java/com/example/notionclone/config/AGENTS.md)** — 실시간 협업 기능 구현 시

### Infrastructure
- **[Docker 설정](./docker-compose.yml)** — 컨테이너 구성 및 환경 설정 시
- **[Nginx 설정](./frontend/nginx.conf)** — 리버스 프록시 및 정적 파일 서빙 설정 시
- **[모니터링 설정](./prometheus.yml)** — Prometheus 메트릭 수집 설정 시
- **[로깅 설정](./backend/src/main/resources/logback-spring.xml)** — 로그 포맷 및 수집 설정 시

## Module-Specific Rules

### Frontend Module
자세한 규칙은 [frontend/AGENTS.md](./frontend/AGENTS.md) 참조

### Backend Module
자세한 규칙은 [backend/AGENTS.md](./backend/AGENTS.md) 참조

