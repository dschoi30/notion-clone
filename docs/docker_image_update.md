# Docker 이미지 갱신 가이드

프론트엔드 개발 환경 Docker 이미지를 갱신하는 방법입니다.

## 프론트엔드 이미지 갱신

### 방법 1: 서비스 재빌드 및 재시작 (권장)

```bash
# 프론트엔드만 재빌드하고 재시작
docker compose -f docker-compose.dev.yml up -d --build frontend
```

### 방법 2: 강제 재빌드 (캐시 무시)

의존성 변경이나 Dockerfile 변경이 있을 때:

```bash
# 캐시 없이 완전히 재빌드
docker compose -f docker-compose.dev.yml build --no-cache frontend
docker compose -f docker-compose.dev.yml up -d frontend
```

### 방법 3: 기존 컨테이너 제거 후 재빌드

```bash
# 컨테이너 중지 및 제거
docker compose -f docker-compose.dev.yml stop frontend
docker compose -f docker-compose.dev.yml rm -f frontend

# 이미지 재빌드 및 시작
docker compose -f docker-compose.dev.yml up -d --build frontend
```

### 방법 4: 모든 서비스 재빌드

프론트엔드뿐만 아니라 다른 서비스도 함께 재빌드:

```bash
# 모든 서비스 재빌드
docker compose -f docker-compose.dev.yml up -d --build
```

## 언제 이미지를 갱신해야 하나요?

다음 경우에 이미지를 갱신해야 합니다:

1. **의존성 변경** (`package.json`, `pnpm-lock.yaml` 수정)
2. **Dockerfile 변경** (`frontend/Dockerfile.dev` 수정)
3. **환경 변수 변경** (`docker-compose.dev.yml`의 환경 변수 수정)
4. **빌드 오류 발생** 시

## 이미지 확인

### 현재 실행 중인 이미지 확인

```bash
# 컨테이너 상태 확인
docker compose -f docker-compose.dev.yml ps frontend

# 이미지 정보 확인
docker images | grep notion-clone-frontend
```

### 빌드 로그 확인

```bash
# 빌드 과정 확인
docker compose -f docker-compose.dev.yml build frontend

# 실행 로그 확인
docker compose -f docker-compose.dev.yml logs -f frontend
```

## 문제 해결

### 이미지가 갱신되지 않을 때

```bash
# 1. 기존 이미지 제거
docker rmi notion-clone-frontend-dev

# 2. 강제 재빌드
docker compose -f docker-compose.dev.yml build --no-cache frontend

# 3. 재시작
docker compose -f docker-compose.dev.yml up -d frontend
```

### 빌드 캐시 정리

```bash
# Docker 빌드 캐시 정리
docker builder prune

# 또는 특정 이미지의 캐시만 정리
docker builder prune --filter "label=com.docker.compose.project=notion-clone"
```

## 빠른 참조

```bash
# 가장 빠른 방법 (일반적인 경우)
docker compose -f docker-compose.dev.yml up -d --build frontend

# 완전히 새로 빌드 (의존성 변경 등)
docker compose -f docker-compose.dev.yml build --no-cache frontend && \
docker compose -f docker-compose.dev.yml up -d frontend
```



