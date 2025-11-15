# 포트 충돌 해결 가이드

Docker 컨테이너를 시작할 때 포트가 이미 사용 중이라는 에러가 발생하는 경우 해결 방법입니다.

## 포트 충돌 확인

### 포트 사용 중인 프로세스 확인

```bash
# 8080 포트 사용 중인 프로세스 확인
lsof -i :8080

# 또는
netstat -an | grep 8080
```

### Docker 컨테이너 확인

```bash
# 실행 중인 컨테이너 확인
docker ps | grep 8080

# 모든 컨테이너 확인 (중지된 것 포함)
docker ps -a | grep backend
```

## 해결 방법

### 방법 1: 로컬 프로세스 종료 (권장)

로컬에서 직접 실행 중인 서비스를 종료:

```bash
# 프로세스 ID 확인
lsof -i :8080

# 프로세스 종료 (PID는 위 명령어 결과에서 확인)
kill -9 <PID>

# 또는 프로세스 이름으로 종료
pkill -f "java.*8080"
```

### 방법 2: Docker 컨테이너 정리 후 재시작

```bash
# 기존 컨테이너 중지 및 제거
docker compose -f docker-compose.dev.yml stop backend
docker compose -f docker-compose.dev.yml rm -f backend

# 재시작
docker compose -f docker-compose.dev.yml up -d backend
```

### 방법 3: 포트 변경

`.env` 파일이나 `docker-compose.dev.yml`에서 포트를 변경:

```yaml
# docker-compose.dev.yml
backend:
  ports:
    - "${BACKEND_PORT:-8081}:8080"  # 호스트 포트를 8081로 변경
```

또는 `.env` 파일에:
```bash
BACKEND_PORT=8081
```

### 방법 4: 모든 서비스 정리 후 재시작

```bash
# 모든 서비스 중지
docker compose -f docker-compose.dev.yml down

# 재시작
docker compose -f docker-compose.dev.yml up -d
```

## 자주 사용하는 포트

프로젝트에서 사용하는 기본 포트:
- **프론트엔드 (개발)**: 5173
- **백엔드**: 8080
- **데이터베이스**: 5432
- **Sentry**: 9000
- **Sentry DB**: 5433
- **Redis**: 6379

## 포트 충돌 방지

### 1. 로컬 개발 vs Docker

로컬에서 직접 실행하는 경우:
```bash
# 백엔드
cd backend && ./gradlew bootRun

# 프론트엔드
cd frontend && pnpm dev
```

Docker를 사용하는 경우:
```bash
docker compose -f docker-compose.dev.yml up -d
```

**둘 중 하나만 사용**하도록 하세요.

### 2. 포트 확인 스크립트

```bash
# 사용 중인 포트 확인
echo "=== 프로젝트 포트 확인 ==="
echo "8080 (백엔드): $(lsof -i :8080 | wc -l) 프로세스"
echo "5173 (프론트엔드): $(lsof -i :5173 | wc -l) 프로세스"
echo "5432 (DB): $(lsof -i :5432 | wc -l) 프로세스"
echo "9000 (Sentry): $(lsof -i :9000 | wc -l) 프로세스"
```

## 문제 해결 체크리스트

1. ✅ 로컬에서 실행 중인 서비스가 있는지 확인
2. ✅ Docker 컨테이너가 중복 실행 중인지 확인
3. ✅ 포트를 사용하는 다른 애플리케이션이 있는지 확인
4. ✅ 필요시 포트 변경 또는 프로세스 종료



