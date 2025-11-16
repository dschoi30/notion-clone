# 로그 시각화 가이드

JSON 형태의 로그를 Grafana 대시보드에서 시각적으로 표현하는 방법을 설명합니다.

## 방법 1: LogQL 집계 함수 사용 (권장)

LogQL의 집계 함수를 사용하여 로그를 메트릭처럼 변환할 수 있습니다.

### 1. 요청 수 통계 패널

**쿼리**:
```logql
# 시간별 요청 수 (requestUri가 있는 로그만)
sum(count_over_time({job="notion-clone-backend"} | json | requestUri != "" [1m]))

# 또는 모든 로그 카운트
sum(count_over_time({job="notion-clone-backend"} [1m]))
```

**패널 설정**:
- Visualization: **Time series**
- Legend: `{{requestUri}}` 또는 `Total Requests`
- Unit: `short` (숫자)

### 2. 엔드포인트별 요청 수

**쿼리**:
```logql
# 엔드포인트별 요청 수
sum by (requestUri) (count_over_time({job="notion-clone-backend"} | json | requestUri != "" [1m]))
```

**패널 설정**:
- Visualization: **Time series**
- Legend: `{{requestUri}}`
- 여러 라인으로 각 엔드포인트별 요청 수 표시

### 3. HTTP 상태 코드별 요청 수

**쿼리**:
```logql
# 상태 코드별 요청 수 (로그에 status 필드가 있는 경우)
sum by (status) (count_over_time({job="notion-clone-backend"} | json | status != "" [1m]))
```

### 4. 에러율 계산

**쿼리**:
```logql
# 전체 요청 수
sum(count_over_time({job="notion-clone-backend"} | json | requestUri != "" [1m]))

# 에러 요청 수
sum(count_over_time({job="notion-clone-backend"} | json | level="ERROR" [1m]))

# 에러율 (%)
(sum(count_over_time({job="notion-clone-backend"} | json | level="ERROR" [1m])) 
 / 
 sum(count_over_time({job="notion-clone-backend"} | json | requestUri != "" [1m]))) * 100
```

**패널 설정**:
- Visualization: **Time series** 또는 **Stat**
- Unit: `percent (0-100)`

### 5. 요청 메서드별 통계

**쿼리**:
```logql
# 메서드별 요청 수
sum by (requestMethod) (count_over_time({job="notion-clone-backend"} | json | requestMethod != "" [1m]))
```

**패널 설정**:
- Visualization: **Time series**
- Legend: `{{requestMethod}}`

### 6. 사용자별 활동 통계

**쿼리**:
```logql
# 사용자별 요청 수
sum by (userId) (count_over_time({job="notion-clone-backend"} | json | userId != "" [1m]))
```

## 방법 2: Promtail Metrics Stage 사용

로그를 Prometheus 메트릭으로 변환하여 더 정교한 시각화가 가능합니다.

### Promtail 설정 수정

`promtail-config.yml`에 metrics stage 추가:

```yaml
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
          requestUri:
      # 메트릭 변환 추가
      - metrics:
          # HTTP 요청 카운터
          http_requests_total:
            type: Counter
            description: "Total number of HTTP requests"
            source: requestUri
            config:
              action: inc
              match_all: true
          # 에러 카운터
          http_errors_total:
            type: Counter
            description: "Total number of HTTP errors"
            source: level
            config:
              action: inc
              match_all: true
              match: "ERROR"
      - timestamp:
          source: timestamp
          format: '2006-01-02 15:04:05.000'
```

### Prometheus에서 메트릭 수집

`prometheus.yml`에 Promtail 메트릭 엔드포인트 추가:

```yaml
scrape_configs:
  # ... 기존 설정 ...
  
  # Promtail 메트릭
  - job_name: 'promtail'
    static_configs:
      - targets: ['promtail:9080']
```

### Grafana에서 메트릭 사용

Prometheus 데이터 소스에서 다음 쿼리 사용:

```promql
# HTTP 요청 수 (초당)
rate(http_requests_total[5m])

# 에러 수 (초당)
rate(http_errors_total[5m])

# 엔드포인트별 요청 수
sum by (requestUri) (rate(http_requests_total[5m]))
```

## 방법 3: Spring Boot Actuator 메트릭 활용 (가장 권장)

이미 설정된 Spring Boot Actuator의 HTTP 메트릭을 사용하는 것이 가장 효율적입니다.

### 사용 가능한 메트릭

```promql
# HTTP 요청 수 (초당)
rate(http_server_requests_seconds_count[5m])

# 엔드포인트별 요청 수
sum by (uri) (rate(http_server_requests_seconds_count[5m]))

# HTTP 상태 코드별 요청 수
sum by (status) (rate(http_server_requests_seconds_count[5m]))

# 평균 응답 시간
rate(http_server_requests_seconds_sum[5m]) / rate(http_server_requests_seconds_count[5m])

# P95 응답 시간
histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m]))
```

### 대시보드 패널 예시

#### 1. 요청 수 (Time Series)
```promql
sum(rate(http_server_requests_seconds_count{uri!="/actuator/prometheus"}[5m]))
```

#### 2. 엔드포인트별 요청 수
```promql
sum by (uri) (rate(http_server_requests_seconds_count{uri!="/actuator/prometheus"}[5m]))
```

#### 3. 상태 코드별 요청 수
```promql
sum by (status) (rate(http_server_requests_seconds_count{uri!="/actuator/prometheus"}[5m]))
```

#### 4. 평균 응답 시간
```promql
sum(rate(http_server_requests_seconds_sum{uri!="/actuator/prometheus"}[5m])) 
/ 
sum(rate(http_server_requests_seconds_count{uri!="/actuator/prometheus"}[5m]))
```

#### 5. 에러율
```promql
sum(rate(http_server_requests_seconds_count{status=~"5..", uri!="/actuator/prometheus"}[5m])) 
/ 
sum(rate(http_server_requests_seconds_count{uri!="/actuator/prometheus"}[5m])) * 100
```

## 방법 4: LogQL + Transform 조합

Grafana의 Transform 기능을 사용하여 로그를 시각화합니다.

### 1. 로그 테이블 패널

**쿼리**:
```logql
{job="notion-clone-backend"} | json
```

**Transform**:
- **Organize fields**: 필요한 필드만 선택 (timestamp, level, requestUri, requestMethod)
- **Filter data by values**: 특정 조건 필터링
- **Group by**: requestUri별 그룹화

### 2. 통계 패널 (Stat)

**쿼리**:
```logql
# 최근 5분간 총 요청 수
count_over_time({job="notion-clone-backend"} | json | requestUri != "" [5m])
```

**패널 설정**:
- Visualization: **Stat**
- Value options: **Last** 또는 **Count**
- Unit: `short`

### 3. 게이지 패널

**쿼리**:
```logql
# 에러율 (%)
(sum(count_over_time({job="notion-clone-backend"} | json | level="ERROR" [5m])) 
 / 
 sum(count_over_time({job="notion-clone-backend"} | json | requestUri != "" [5m]))) * 100
```

**패널 설정**:
- Visualization: **Gauge**
- Min: 0, Max: 100
- Unit: `percent (0-100)`

## 추천 방법

### 즉시 사용 가능 (권장)
**Spring Boot Actuator 메트릭 사용**
- 이미 설정되어 있음
- Prometheus에서 바로 사용 가능
- HTTP 요청, 응답 시간, 상태 코드 등 모든 메트릭 제공
- 가장 정확하고 효율적

### 로그 기반 통계가 필요한 경우
**LogQL 집계 함수 사용**
- 추가 설정 불필요
- 로그에서 직접 통계 생성
- 유연한 필터링 가능

### 정교한 로그 기반 메트릭이 필요한 경우
**Promtail Metrics Stage 사용**
- 로그를 Prometheus 메트릭으로 변환
- 장기 저장 및 알림 설정 가능
- 더 복잡한 집계 가능

## 대시보드 구성 예시

### HTTP 요청 모니터링 대시보드

1. **총 요청 수** (Stat)
   - Query: `sum(rate(http_server_requests_seconds_count[5m]))`
   
2. **엔드포인트별 요청 수** (Time Series)
   - Query: `sum by (uri) (rate(http_server_requests_seconds_count[5m]))`
   
3. **상태 코드별 요청 수** (Time Series)
   - Query: `sum by (status) (rate(http_server_requests_seconds_count[5m]))`
   
4. **평균 응답 시간** (Time Series)
   - Query: `sum(rate(http_server_requests_seconds_sum[5m])) / sum(rate(http_server_requests_seconds_count[5m]))`
   
5. **에러율** (Gauge)
   - Query: `sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m])) / sum(rate(http_server_requests_seconds_count[5m])) * 100`

## 참고 자료

- [LogQL 공식 문서](https://grafana.com/docs/loki/latest/logql/)
- [Promtail Metrics Stage](https://grafana.com/docs/loki/latest/clients/promtail/stages/metrics/)
- [Spring Boot Actuator Metrics](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html#actuator.metrics)

