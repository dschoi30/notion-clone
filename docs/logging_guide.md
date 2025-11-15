# 로깅 시스템 사용 가이드

이 문서는 Notion Clone 프로젝트에 도입된 로깅 시스템의 사용 방법을 설명합니다.

## 개요

프로젝트는 백엔드와 프론트엔드 모두에 구조화된 로깅 시스템을 도입했습니다:

- **백엔드**: Logback + Logstash Encoder (JSON 구조화 로깅)
- **프론트엔드**: loglevel (브라우저 호환 로깅) + Sentry (에러 추적)

## 백엔드 로깅

### 설정 파일

백엔드 로깅은 `logback-spring.xml`에서 관리됩니다:
- 개발 환경: 콘솔에 JSON + 텍스트 로그 출력
- 프로덕션 환경: JSON 형식으로 파일 및 콘솔 출력

### 로그 레벨 설정

환경 변수로 로그 레벨을 제어할 수 있습니다:

```bash
# 애플리케이션 로그 레벨
LOG_LEVEL_APP=DEBUG  # 또는 INFO, WARN, ERROR

# 보안 관련 로그 레벨
LOG_LEVEL_SECURITY=DEBUG

# JWT 필터 로그 레벨
LOG_LEVEL_JWT_FILTER=DEBUG

# 인증 서비스 로그 레벨
LOG_LEVEL_AUTH_SERVICE=DEBUG

# Hibernate 로그 레벨
LOG_LEVEL_HIBERNATE=WARN
```

### 코드에서 사용하기

Lombok의 `@Slf4j` 어노테이션을 사용합니다:

```java
@Slf4j
@Service
public class MyService {
    public void doSomething() {
        log.debug("디버그 메시지");
        log.info("정보 메시지");
        log.warn("경고 메시지");
        log.error("에러 메시지", exception);
    }
}
```

### 요청 추적 ID

모든 HTTP 요청에 자동으로 추적 ID가 생성됩니다:
- MDC에 `traceId`로 저장됨
- 응답 헤더 `X-Request-Id`에 포함됨
- 모든 로그에 자동으로 포함됨

### 로그 파일 위치

프로덕션 환경:
- 일반 로그: `logs/notion-clone.log`
- 에러 로그: `logs/notion-clone-error.log`
- 로그 로테이션: 일별, 최대 100MB, 30일 보관

## 프론트엔드 로깅

### loglevel 로거 사용

기존 `createLogger` 함수를 그대로 사용할 수 있습니다 (loglevel 기반으로 구현됨):

```javascript
import { createLogger } from '@/lib/logger';

const logger = createLogger('MyComponent');

logger.debug('디버그 메시지');
logger.info('정보 메시지');
logger.warn('경고 메시지');
logger.error('에러 메시지', { additionalData: 'value' });
```

### 환경 변수 설정

프론트엔드 환경 변수는 `.env` 파일 또는 빌드 시 설정:

```bash
# Sentry DSN (에러 추적용, 선택)
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# 로그 레벨
VITE_LOG_LEVEL=DEBUG  # 또는 INFO, WARN, ERROR

# 디버그 네임스페이스 필터 (쉼표로 구분)
VITE_DEBUG_NS=AuthContext,api,WorkspaceContext
```

### 런타임 디버그 모드

개발 중에는 URL 파라미터나 localStorage로 디버그 모드를 활성화할 수 있습니다:

```javascript
// URL 파라미터로 활성화
// http://localhost:5173?debug=AuthContext,api

// localStorage로 활성화
localStorage.setItem('DEBUG', 'AuthContext,api');
```

### Sentry 에러 추적

Sentry는 자동으로 에러를 캡처합니다. 수동으로 에러를 전송하려면:

```javascript
import { captureException, captureMessage } from '@/lib/sentry';

try {
  // 코드 실행
} catch (error) {
  captureException(error, {
    context: 'additional context',
  });
}

// 커스텀 메시지 전송
captureMessage('Something went wrong', 'warning');
```

### 사용자 컨텍스트

사용자 로그인 시 Sentry에 자동으로 사용자 정보가 설정됩니다. 수동으로 설정하려면:

```javascript
import { setSentryUser } from '@/lib/sentry';

setSentryUser({
  id: '123',
  email: 'user@example.com',
  username: 'username',
});
```

## 로그 포맷

### 백엔드 (JSON)

```json
{
  "timestamp": "2024-01-01 12:00:00.000",
  "level": "INFO",
  "thread": "http-nio-8080-exec-1",
  "logger": "com.example.notionclone.service.MyService",
  "message": "로그 메시지",
  "traceId": "abc123def456",
  "requestMethod": "GET",
  "requestUri": "/api/documents",
  "userId": "123"
}
```

### 프론트엔드 (개발 환경)

```
12:00:00.000 INFO [MyComponent] 로그 메시지 {"additionalData":"value"}
```

### 프론트엔드 (프로덕션 환경)

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "message": "로그 메시지",
  "namespace": "MyComponent",
  "additionalData": "value"
}
```

## 모니터링 및 분석

### 로그 수집 시스템 연동

백엔드의 JSON 로그는 다음 시스템과 쉽게 연동할 수 있습니다:
- **ELK Stack** (Elasticsearch + Logstash + Kibana)
- **Grafana Loki** + Promtail
- **Datadog**, **New Relic** 등 상용 서비스

자세한 연동 방법은 아래 섹션을 참고하세요.

### Sentry 대시보드

Sentry를 설정하면 다음을 확인할 수 있습니다:
- 에러 발생 빈도 및 추세
- 에러별 사용자 영향도
- 성능 메트릭
- 세션 리플레이 (프로덕션 환경)

## 로그 수집 시스템 연동 가이드

### 1. Grafana Loki + Promtail (권장: 경량 솔루션)

Grafana Loki는 경량 로그 수집 시스템으로, Promtail을 통해 로그를 수집합니다.

#### Docker Compose 설정

`docker-compose.yml`에 다음 서비스를 추가:

```yaml
services:
  loki:
    image: grafana/loki:latest
    container_name: notion-clone-loki
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - notion-network
    volumes:
      - loki_data:/loki
    restart: unless-stopped

  promtail:
    image: grafana/promtail:latest
    container_name: notion-clone-promtail
    volumes:
      - ./promtail-config.yml:/etc/promtail/config.yml
      - ./backend/logs:/var/log/backend:ro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - notion-network
    depends_on:
      - loki
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: notion-clone-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - notion-network
    depends_on:
      - loki
    restart: unless-stopped

volumes:
  loki_data:
  grafana_data:
```

#### Promtail 설정 파일 (`promtail-config.yml`)

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: backend-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: notion-clone-backend
          __path__: /var/log/backend/*.log
    pipeline_stages:
      - json:
          expressions:
            timestamp: timestamp
            level: level
            logger: logger
            message: message
            traceId: traceId
            requestMethod: requestMethod
            requestUri: requestUri
            userId: userId
      - labels:
          level:
          logger:
          traceId:
          requestMethod:
      - timestamp:
          source: timestamp
          format: '2006-01-02 15:04:05.000'
```

#### Grafana 데이터 소스 설정

1. Grafana에 접속: `http://localhost:3000`
2. 로그인: `admin` / `admin`
3. Configuration → Data Sources → Add data source
4. Loki 선택
5. URL: `http://loki:3100`
6. Save & Test

#### LogQL 쿼리 예시

```logql
# 에러 로그만 조회
{job="notion-clone-backend"} |= "ERROR"

# 특정 traceId로 요청 추적
{job="notion-clone-backend"} | json | traceId="abc123def456"

# 특정 사용자의 로그
{job="notion-clone-backend"} | json | userId="123"

# 특정 엔드포인트의 로그
{job="notion-clone-backend"} | json | requestUri=~"/api/documents.*"
```

### 2. ELK Stack (Elasticsearch + Logstash + Kibana)

ELK Stack은 강력한 로그 분석 플랫폼입니다.

#### Docker Compose 설정

```yaml
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: notion-clone-elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data
    networks:
      - notion-network
    restart: unless-stopped

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    container_name: notion-clone-logstash
    volumes:
      - ./logstash-config.conf:/usr/share/logstash/pipeline/logstash.conf
      - ./backend/logs:/var/log/backend:ro
    ports:
      - "5044:5044"
    networks:
      - notion-network
    depends_on:
      - elasticsearch
    restart: unless-stopped

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: notion-clone-kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - notion-network
    depends_on:
      - elasticsearch
    restart: unless-stopped

volumes:
  es_data:
```

#### Logstash 설정 파일 (`logstash-config.conf`)

```ruby
input {
  file {
    path => "/var/log/backend/*.log"
    start_position => "beginning"
    codec => "json"
    type => "backend-log"
  }
}

filter {
  if [type] == "backend-log" {
    # JSON 파싱 (이미 JSON 형식이므로 추가 파싱 불필요)
    # 필요한 경우 추가 필터링
    if [level] == "ERROR" {
      mutate {
        add_tag => [ "error" ]
      }
    }
    
    # 날짜 파싱
    date {
      match => [ "timestamp", "yyyy-MM-dd HH:mm:ss.SSS" ]
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "notion-clone-logs-%{+YYYY.MM.dd}"
  }
  
  # 디버깅용 stdout
  stdout {
    codec => rubydebug
  }
}
```

#### Kibana 인덱스 패턴 설정

1. Kibana 접속: `http://localhost:5601`
2. Management → Stack Management → Index Patterns
3. Create index pattern: `notion-clone-logs-*`
4. Time field: `@timestamp`
5. Discover에서 로그 확인

### 3. Datadog 연동

Datadog은 클라우드 기반 모니터링 서비스입니다.

#### Datadog Agent 설치 (Docker)

```yaml
services:
  datadog-agent:
    image: gcr.io/datadoghq/agent:latest
    container_name: notion-clone-datadog
    environment:
      - DD_API_KEY=your-datadog-api-key
      - DD_SITE=datadoghq.com
      - DD_LOGS_ENABLED=true
      - DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL=true
      - DD_CONTAINER_EXCLUDE="name:datadog-agent"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc/:/host/proc/:ro
      - /sys/fs/cgroup/:/host/sys/fs/cgroup:ro
      - ./backend/logs:/var/log/backend:ro
    networks:
      - notion-network
    restart: unless-stopped
```

#### Datadog 로그 설정

Datadog Agent 설정 파일 (`datadog.yaml`):

```yaml
logs_enabled: true
logs_config:
  container_collect_all: true
  container_exclude: "name:datadog-agent"
```

컨테이너에 라벨 추가:

```yaml
backend:
  labels:
    com.datadoghq.ad.logs: '[{"source": "java", "service": "notion-clone-backend"}]'
```

### 4. 파일 기반 로그 수집 (Filebeat)

Filebeat는 경량 로그 수집기로, Elasticsearch나 Logstash로 전송합니다.

#### Filebeat 설정 (`filebeat.yml`)

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/backend/*.log
    json.keys_under_root: true
    json.add_error_key: true
    fields:
      service: notion-clone-backend
      environment: production
    fields_under_root: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "notion-clone-logs-%{+yyyy.MM.dd}"

processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded
```

#### Docker Compose 설정

```yaml
services:
  filebeat:
    image: docker.elastic.co/beats/filebeat:8.11.0
    container_name: notion-clone-filebeat
    user: root
    volumes:
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - ./backend/logs:/var/log/backend:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - notion-network
    depends_on:
      - elasticsearch
    restart: unless-stopped
```

### 5. 프론트엔드 로그 수집

프론트엔드 로그는 주로 Sentry를 통해 수집되지만, 추가로 백엔드로 전송할 수 있습니다.

#### 백엔드 로그 수집 API 추가

```java
@RestController
@RequestMapping("/api/logs")
public class LogCollectorController {
    
    @PostMapping("/frontend")
    public ResponseEntity<Void> collectFrontendLog(@RequestBody FrontendLogRequest request) {
        log.info("Frontend log: {}", request);
        // 필요시 별도 로그 파일에 저장
        return ResponseEntity.ok().build();
    }
}
```

#### 프론트엔드에서 로그 전송

```javascript
// logger.js에 추가
const sendToBackend = (level, message, meta) => {
  if (level === 'error' || level === 'warn') {
    fetch('/api/logs/frontend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message,
        meta,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }),
    }).catch(err => console.error('Failed to send log:', err));
  }
};
```

### 6. 로그 수집 시스템 선택 가이드

| 시스템 | 장점 | 단점 | 추천 용도 |
|--------|------|------|-----------|
| **Grafana Loki** | 경량, 빠른 쿼리, Grafana 통합 | 기능 제한적 | 중소규모 프로젝트 |
| **ELK Stack** | 강력한 분석 기능, 풍부한 플러그인 | 리소스 많이 사용 | 대규모 프로젝트 |
| **Datadog** | 관리형 서비스, 쉬운 설정 | 유료, 비용 증가 | 클라우드 환경 |
| **Filebeat** | 경량, 단순 설정 | 추가 구성 필요 | ELK와 함께 사용 |

### 7. 프로덕션 배포 고려사항

1. **로그 보관 기간**
   - 일반 로그: 7-30일
   - 에러 로그: 90일 이상
   - 감사 로그: 1년 이상

2. **로그 압축 및 아카이빙**
   - 오래된 로그는 압축하여 S3 등에 저장
   - 필요시 복원 가능하도록 인덱스 유지

3. **보안**
   - 민감 정보 마스킹
   - 로그 접근 권한 관리
   - TLS를 통한 로그 전송

4. **비용 최적화**
   - 샘플링 적용 (예: INFO 로그 10%, ERROR 로그 100%)
   - 불필요한 로그 필드 제거
   - 로그 보관 기간 조정

## 베스트 프랙티스

1. **적절한 로그 레벨 사용**
   - `DEBUG`: 개발 중 상세 정보
   - `INFO`: 일반적인 정보성 메시지
   - `WARN`: 경고 (처리 가능한 문제)
   - `ERROR`: 에러 (처리 불가능한 문제)

2. **민감 정보 마스킹**
   - 비밀번호, 토큰, 개인정보는 로그에 포함하지 않기
   - 필요 시 마스킹 처리

3. **구조화된 로깅**
   - 메시지와 함께 컨텍스트 정보 포함
   - JSON 형식으로 일관성 유지

4. **성능 고려**
   - 프로덕션에서는 불필요한 DEBUG 로그 비활성화
   - Sentry 샘플링 비율 조정

## 문제 해결

### 백엔드 로그가 보이지 않을 때

1. `logback-spring.xml` 파일이 올바른 위치에 있는지 확인
2. 환경 변수 `LOG_LEVEL_APP` 확인
3. 로그 파일 권한 확인

### 프론트엔드 로그가 보이지 않을 때

1. 브라우저 콘솔 확인
2. `VITE_LOG_LEVEL` 환경 변수 확인
3. 네임스페이스 필터 확인 (`VITE_DEBUG_NS`)

### Sentry가 작동하지 않을 때

1. `VITE_SENTRY_DSN` 환경 변수 확인
2. 브라우저 콘솔에서 Sentry 초기화 메시지 확인
3. 네트워크 탭에서 Sentry API 호출 확인

