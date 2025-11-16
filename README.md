## Notion Clone

리치 텍스트 편집, 테이블/갤러리 뷰, 실시간 협업(WebSocket), 권한/알림, 버전 관리 등을 제공하는 노션 스타일 협업 문서 애플리케이션입니다.

### 기술 스택
- **프론트엔드**: Vite + React, shadcn/ui, Zustand, TipTap, dnd-kit
- **백엔드**: Spring Boot 3, Spring Security, JPA, WebSocket (STOMP)
- **데이터베이스**: PostgreSQL
- **인증/스토리지**: JWT, (옵션) Cloudinary
- **배포**: Docker, Nginx(운영 정적 서빙/리버스 프록시)

### 폴더 구조
- `frontend/`: React 앱 (Vite)
- `backend/`: Spring Boot API/WS 서버
- `docker-compose.dev.yml`: 개발용(프론트 Vite dev 서버 + 백엔드 + DB)
- `docker-compose.yml`: 운영용(Nginx 정적 서빙 + 백엔드 + DB)

### 빠른 시작

#### 0) 사전 준비
- Docker/Docker Compose 설치
- 기본 포트: 프론트 5173(dev)/80(prod), 백엔드 8080, DB 5432

#### 1) 환경변수 설정
루트에서 `.env` 파일 생성:
```bash
cp env.example .env
```
필요 시 다음 값 수정:
- DB: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_URL` 등
- JWT: `JWT_SECRET`, `JWT_EXPIRATION`
- OAuth/Cloudinary: `GOOGLE_CLIENT_ID`, `CLOUDINARY_*`
- 프론트: `VITE_BACKEND_ORIGIN`(dev 프록시 대상), `VITE_API_BASE_URL`(기본 `/api` 권장)

#### 2) 개발 모드(Hot Reload)
Vite dev 서버 + Spring Boot + Postgres:
```bash
docker compose -f docker-compose.dev.yml up --build
```
- 접속: `http://localhost:5173`
- 프록시: 프론트의 `/api`, `/ws` → `backend:8080` 자동 프록시

#### 3) 운영 모드(정적 배포)
Nginx 정적 서빙 + Spring Boot + Postgres:
```bash
docker compose up --build -d
```
- 접속: `http://localhost`
- Nginx가 `/api`(REST), `/ws`(WebSocket)를 백엔드로 리버스 프록시

## 로컬 개발(선택)
프론트 단독:
```bash
cd frontend
pnpm install
pnpm dev
```
백엔드 단독:
```bash
cd backend
./gradlew bootRun
```

## 환경 변수 요약
`.env` 참고:

### 필수 환경 변수
- **DB**: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
- **JWT**: `JWT_SECRET`, `JWT_EXPIRATION`
- **포트**: `BACKEND_PORT`, `FRONTEND_PORT`

### 선택적 환경 변수 (기본값 포함)

#### 프론트엔드
- `VITE_BACKEND_ORIGIN`: dev 프록시 대상 (기본값: `http://backend:8080`)
- `VITE_API_BASE_URL`: axios 기본 baseURL (기본값: `/api`, 운영 권장: `/api`)
- `VITE_SENTRY_DSN`: Sentry DSN (에러 추적용, 기본값: 없음, 선택)
- `VITE_LOG_LEVEL`: 로그 레벨 (기본값: 개발=DEBUG, 프로덕션=INFO)
  - 가능한 값: `ERROR`, `WARN`, `INFO`, `DEBUG`, `TRACE`
- `VITE_DEBUG_NS`: 디버그 네임스페이스 필터 (기본값: 없음, 선택)
  - 쉼표로 구분, 예: `AuthContext,api`
- `VITE_APP_VERSION`: 앱 버전 (기본값: `unknown`, Sentry 릴리즈 추적용)

#### 백엔드
- `LOG_LEVEL_APP`: 애플리케이션 로그 레벨 (기본값: `INFO`)
- `LOG_LEVEL_SECURITY`: 보안 로그 레벨 (기본값: `INFO`)
- `LOG_LEVEL_JWT_FILTER`: JWT 필터 로그 레벨 (기본값: `INFO`)
- `LOG_LEVEL_AUTH_SERVICE`: 인증 서비스 로그 레벨 (기본값: `INFO`)
- `LOG_LEVEL_HIBERNATE`: Hibernate 로그 레벨 (기본값: `WARN`)

#### OAuth/외부 서비스
- `GOOGLE_CLIENT_ID`: Google OAuth 클라이언트 ID (선택)
- `CLOUDINARY_*`: Cloudinary 설정 (선택)

## Sentry 에러 추적 (선택)

클라우드 Sentry를 사용하여 에러 추적 및 성능 모니터링을 설정할 수 있습니다.

### 설정 방법
1. [Sentry.io](https://sentry.io)에서 계정 생성 및 프로젝트 생성
2. 프로젝트 설정에서 DSN 복사
3. `.env` 파일에 DSN 설정:
   ```bash
   VITE_SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project-id
   ```
4. (선택) 릴리즈 버전 설정:
   ```bash
   VITE_APP_VERSION=1.0.0
   ```
5. 프론트엔드 재시작

### 주요 기능
- **에러 추적**: 자동으로 JavaScript 에러 캡처
- **성능 모니터링**: 페이지 로드 시간 및 API 응답 시간 추적
- **세션 리플레이**: 에러 발생 시 사용자 행동 재현
- **릴리즈 추적**: 배포별 에러 발생률 추적

자세한 내용은 `docs/sentry_monitoring_guide.md` 참고

## 주요 동작
- API: `/api/**`
- WebSocket: `/ws/**` (SockJS/STOMP, JWT는 쿼리 파라미터 `?token=...`)
- SPA 라우팅: Nginx `try_files`로 `/index.html` 처리
