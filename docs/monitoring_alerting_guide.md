# 모니터링 및 알림 설정 가이드

이 문서는 Notion Clone 프로젝트의 CPU/메모리 모니터링 및 알림 설정 방법을 설명합니다.

## 개요

프로젝트는 다음 모니터링 시스템을 사용합니다:
- **Prometheus**: 메트릭 수집 및 저장
- **Node Exporter**: 호스트 시스템 메트릭 (CPU, 메모리, 디스크 등)
- **cAdvisor**: Docker 컨테이너 메트릭
- **Grafana**: 메트릭 시각화 및 알림

## 서비스 시작

```bash
# 모든 모니터링 서비스 시작
docker-compose up -d prometheus node-exporter cadvisor

# 또는 전체 서비스 시작
docker-compose up -d
```

## Grafana에 Prometheus 데이터 소스 추가

1. Grafana 접속: `http://localhost:3000` (admin/admin)
2. **Configuration** → **Data Sources** → **Add data source**
3. **Prometheus** 선택
4. 설정:
   - **URL**: `http://prometheus:9090`
   - **Access**: Server (default)
5. **Save & Test** 클릭

## 대시보드 생성

### 1. CPU 사용률 대시보드

1. **Dashboards** → **New Dashboard** → **Add visualization**
2. **Query A** 입력:
   ```promql
   # 호스트 CPU 사용률 (평균)
   100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
   ```
3. **+ Query** 버튼 클릭하여 **Query B** 추가:
   ```promql
   # 컨테이너별 CPU 사용률 (id 라벨 사용)
   sum(rate(container_cpu_usage_seconds_total{id=~"/docker/.*"}[5m])) by (id) * 100
   ```
4. 패널 제목: "CPU Usage"
5. **Save dashboard**

**여러 쿼리 사용 시 동작**:
- 각 쿼리는 **별도의 시리즈(라인)**로 표시됩니다
- 쿼리별로 다른 색상과 라벨로 구분됩니다
- 범례(Legend)에서 각 쿼리를 개별적으로 확인/숨김 처리 가능
- **Transform** 탭에서 여러 쿼리를 집계하거나 계산할 수 있습니다

### 2. 메모리 사용률 대시보드

1. **Add visualization**
2. **Query A** 입력:
   ```promql
   # 호스트 메모리 사용률
   (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
   ```
3. **Run queries** 클릭하여 데이터 확인
4. **Visualization** 탭에서 **Time series** 선택 확인
5. **Panel options** → **Unit**: `Percent (0-100)` 설정
6. 패널 제목: "Memory Usage"
7. **Save dashboard**

**Query Type 설명**:
- **Range**: 시간 범위에 대한 시계열 데이터를 반환합니다
  - 예: "Last 1 hour" 동안의 모든 데이터 포인트
  - 그래프/차트 표시에 사용
  - 대시보드 패널에서 일반적으로 사용
- **Instant**: 특정 시점의 단일 값만 반환합니다
  - 예: 현재 시점의 CPU 사용률 값 하나
  - 숫자 표시(Stat), 게이지(Gauge) 패널에 사용
  - 알림 규칙 평가에 사용

**문제 해결**:
- 데이터가 안 보이면:
  1. **Query A** 옆의 **Options** (⚙️) 클릭
  2. **Format**: `Time series` 확인
  3. **Type**: `Range` 확인 (Instant 아님) ← 그래프 표시용
  4. 대시보드 상단의 **시간 범위** 확인 (Last 1 hour 등)
  5. **Run queries** 다시 클릭

### 3. 여러 쿼리 활용 예시

#### 예시 1: 여러 컨테이너 비교
- **Query A**: `sum(rate(container_cpu_usage_seconds_total{id=~"/docker/.*backend.*"}[5m])) by (id) * 100`
- **Query B**: `sum(rate(container_cpu_usage_seconds_total{id=~"/docker/.*frontend.*"}[5m])) by (id) * 100`
- **Query C**: `sum(rate(container_cpu_usage_seconds_total{id=~"/docker/.*db.*"}[5m])) by (id) * 100`
- 결과: 각 컨테이너의 CPU 사용률을 한 패널에서 비교

#### 예시 2: 호스트 vs 컨테이너 비교
- **Query A**: `100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)` (호스트 전체)
- **Query B**: `sum(rate(container_cpu_usage_seconds_total{id=~"/docker/.*"}[5m])) * 100` (모든 컨테이너 합계)
- 결과: 호스트 전체 CPU와 컨테이너 합계를 비교하여 오버헤드 확인

#### 예시 3: Transform으로 계산
1. **Query A**: CPU 사용률
2. **Query B**: 메모리 사용률
3. **Transform** 탭 → **Add transformation** → **Calculate field**
   - Operation: `A + B` (CPU + Memory)
   - 또는 `(A + B) / 2` (평균)

## 알림 규칙 설정

### 1. CPU 임계치 알림

1. **Alerting** → **Alert rules** → **New alert rule**
2. **Rule name**: `High CPU Usage` 입력
3. **Data source**: Prometheus 선택
4. **Query A** 입력 (조건 없이 CPU 사용률만 계산):
   ```promql
   100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
   ```
   - 이 쿼리는 현재 CPU 사용률(%)을 반환합니다
   - **Run queries** 클릭하여 쿼리 테스트 (현재 값이 표시되어야 함)
5. **Alert condition** 설정:
   - **WHEN**: `last()` (또는 `avg()`)
   - **OF**: `A` (Query A 선택)
   - **IS ABOVE**: `80` (CPU 사용률이 80% 초과일 때 알림)
6. **Preview alert rule condition** 클릭하여 조건 확인
7. **Evaluation interval**: `1m` (1분마다 평가)
8. **For**: `5m` (5분 동안 지속되면 알림 발송)
9. **Notifications**: 알림 채널 선택 (이메일, Slack 등)
10. **Save rule** 클릭

**참고**: Query에서 조건(`> 80`)을 제거하고 Alert condition에서 임계치를 설정하는 것이 더 명확합니다. 이렇게 하면 현재 값을 확인할 수 있고, 임계치를 쉽게 조정할 수 있습니다.

### 2. 메모리 임계치 알림

1. **New alert rule**
2. **Rule name**: `High Memory Usage` 입력
3. **Query A** 입력 (조건 없이 메모리 사용률만 계산):
   ```promql
   (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
   ```
   - 이 쿼리는 현재 메모리 사용률(%)을 반환합니다
   - **Run queries** 클릭하여 쿼리 테스트 (현재 값이 표시되어야 함)
4. **Alert condition** 설정:
   - **WHEN**: `last()`
   - **OF**: `A`
   - **IS ABOVE**: `85` (메모리 사용률이 85% 초과일 때 알림)
5. **Preview alert rule condition** 클릭하여 조건 확인
6. **Evaluation interval**: `1m`
7. **For**: `5m`
8. **Notifications**: 알림 채널 선택
9. **Save rule** 클릭

### 3. 컨테이너별 CPU/메모리 알림

**방법 1: CPU만 모니터링**
1. **New alert rule**
2. **Rule name**: `Container High CPU Usage`
3. **Query A** 입력 (조건 없이 CPU 사용률만 계산):
   ```promql
   sum(rate(container_cpu_usage_seconds_total{id=~"/docker/.*"}[5m])) by (id) * 100
   ```
4. **Alert condition**: `WHEN last() OF A IS ABOVE 80`
5. **Labels**: `container={{ $labels.id }}` (컨테이너 ID 포함)
6. **Save rule**

**방법 2: CPU와 메모리 모두 모니터링 (OR 조건)**
1. **New alert rule**
2. **Rule name**: `Container High Resource Usage`
3. **Query A** (CPU, 조건 없이):
   ```promql
   sum(rate(container_cpu_usage_seconds_total{id=~"/docker/.*"}[5m])) by (id) * 100
   ```
4. **Query B** (Memory, 조건 없이):
   ```promql
   (sum(container_memory_usage_bytes{id=~"/docker/.*"}) by (id) / sum(container_spec_memory_limit_bytes{id=~"/docker/.*"}) by (id)) * 100
   ```
5. **Alert condition**: 
   - **WHEN**: `last()`
   - **OF**: `A OR B` (둘 중 하나라도 초과하면 알림)
   - **IS ABOVE**: `80` (CPU 80% 또는 메모리 80% 초과)
   - 또는 별도 규칙으로 CPU와 메모리를 각각 설정하는 것을 권장
6. **Labels**: `container={{ $labels.id }}` (컨테이너 ID 포함)
7. **Save rule**

**권장 방법**: Query에서 조건을 제거하고 Alert condition에서 임계치를 설정하면 현재 값을 확인할 수 있고 더 유연합니다.

## 알림 채널 설정

### 1. 이메일 알림

1. **Alerting** → **Notification channels** → **New channel**
2. **Type**: Email
3. **Name**: `Email Alerts`
4. **Email addresses**: 알림 받을 이메일 주소 입력
5. **Send on all alerts**: 활성화
6. **Save**

### 2. Slack 알림 (선택)

1. **New channel** → **Type**: Slack
2. Slack Webhook URL 입력
3. **Channel**: `#alerts` (알림 받을 채널)
4. **Save**

## 유용한 PromQL 쿼리

### 호스트 메트릭

```promql
# CPU 사용률
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 메모리 사용률
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# 디스크 사용률
(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100

# 네트워크 트래픽 (수신)
rate(node_network_receive_bytes_total[5m])

# 네트워크 트래픽 (송신)
rate(node_network_transmit_bytes_total[5m])
```

### 컨테이너 메트릭

**중요**: cAdvisor 메트릭에는 `name` 라벨이 없고 `id` 라벨을 사용합니다.

```promql
# 컨테이너별 CPU 사용률 (id 라벨 사용)
sum(rate(container_cpu_usage_seconds_total{id=~"/docker/.*"}[5m])) by (id) * 100

# 모든 Docker 컨테이너 CPU 사용률 합계
sum(rate(container_cpu_usage_seconds_total{id=~"/docker/.*"}[5m])) * 100

# 컨테이너별 메모리 사용량 (MB) - 전체 메모리 (캐시 포함)
sum(container_memory_usage_bytes{id=~"/docker/.*"}) by (id) / 1024 / 1024

# 컨테이너별 메모리 사용량 (MB) - RSS (실제 물리 메모리만)
sum(container_memory_rss{id=~"/docker/.*"}) by (id) / 1024 / 1024

# 컨테이너별 메모리 사용률
(sum(container_memory_usage_bytes{id=~"/docker/.*"}) by (id) / sum(container_spec_memory_limit_bytes{id=~"/docker/.*"}) by (id)) * 100

# 특정 컨테이너 ID로 필터링 (예시)
container_cpu_usage_seconds_total{id=~"/docker/.*notion.*"}
```

## Spring Boot Actuator 메트릭 설정

Spring Boot 애플리케이션 메트릭을 Prometheus로 노출하려면:

### 1. 의존성 추가 (이미 완료됨)
- `build.gradle`에 `io.micrometer:micrometer-registry-prometheus` 추가

### 2. Actuator 설정 (이미 완료됨)
- `application.yml`에 `management.endpoints.web.exposure.include: health,prometheus` 추가

### 3. Security 설정 (이미 완료됨)
- `SecurityConfig`에서 `/actuator/prometheus` 엔드포인트 허용

### 4. Prometheus 스크랩 설정 (이미 완료됨)
- `prometheus.yml`에 백엔드 job 추가

### 5. 백엔드 재시작
```bash
docker-compose restart backend prometheus
```

### 6. 메트릭 확인
```bash
# 백엔드 메트릭 엔드포인트 확인
curl http://localhost:8080/actuator/prometheus | grep http_server_requests

# Prometheus에서 메트릭 확인
curl "http://localhost:9090/api/v1/query?query=http_server_requests_seconds_count"
```

## 대시보드 임포트

### 1. Grafana 공식 대시보드 사용 (대시보드 ID로 임포트)

1. **Dashboards** → **Import**
2. **Import via grafana.com** 탭 선택
3. 다음 대시보드 ID 입력:
   - **Node Exporter Full**: `1860` (호스트 메트릭 전체)
   - **Docker Container & Host Metrics**: `179` (컨테이너 메트릭)
   - **Prometheus Stats**: `2` (Prometheus 자체 모니터링)
   - **cAdvisor Exporter**: `14282` (컨테이너 상세 메트릭)
4. **Load** 클릭
5. **Prometheus** 데이터 소스 선택
6. **Import** 클릭

### 2. JSON 파일로 임포트

1. **Dashboards** → **Import**
2. **Upload JSON file** 클릭
3. JSON 파일 선택
4. 또는 **Paste JSON**에 JSON 내용 붙여넣기
5. **Prometheus** 데이터 소스 선택
6. **Import** 클릭

### 3. Grafana.com에서 대시보드 찾기

1. [Grafana Dashboards](https://grafana.com/grafana/dashboards/) 접속
2. 검색어 입력 (예: "node exporter", "docker", "prometheus")
3. 원하는 대시보드 선택
4. **Dashboard ID** 복사
5. Grafana에서 **Import** → **Import via grafana.com** → ID 입력

### 4. 추천 대시보드

#### 호스트 모니터링
- **Node Exporter Full** (ID: `1860`)
  - CPU, 메모리, 디스크, 네트워크 등 호스트 전체 메트릭
  - 가장 인기 있는 Node Exporter 대시보드

#### 컨테이너 모니터링
- **Docker Container & Host Metrics** (ID: `179`)
  - 컨테이너별 CPU, 메모리, 네트워크 사용량
  - 호스트와 컨테이너 비교

- **cAdvisor Exporter** (ID: `14282`)
  - cAdvisor 메트릭 기반 상세 컨테이너 모니터링

#### Prometheus 모니터링
- **Prometheus Stats** (ID: `2`)
  - Prometheus 자체 성능 모니터링

### 5. 대시보드 내보내기

자신이 만든 대시보드를 공유하려면:

1. 대시보드 편집 모드
2. 우측 상단 **Settings** (⚙️) 클릭
3. **JSON Model** 탭 클릭
4. JSON 복사 또는 **Save to file** 클릭
5. 다른 Grafana 인스턴스에서 임포트 가능

### 6. 대시보드 수정 및 커스터마이징

임포트한 대시보드를 수정하려면:

1. 대시보드 열기
2. 우측 상단 **Settings** (⚙️) 클릭
3. **General** → **Make editable** 활성화
4. 패널 편집 가능
5. 수정 후 **Save dashboard**

## 문제 해결

### Prometheus가 메트릭을 수집하지 않을 때

1. Prometheus 상태 확인: `http://localhost:9090/targets`
2. 모든 타겟이 "UP" 상태인지 확인
3. Prometheus 로그 확인: `docker-compose logs prometheus`

### 알림이 작동하지 않을 때

1. **Alerting** → **Alert rules**에서 규칙 상태 확인
2. **Alerting** → **Alert history**에서 알림 이력 확인
3. Notification channel 설정 확인
4. Grafana 로그 확인: `docker-compose logs grafana`

### cAdvisor가 컨테이너를 감지하지 않을 때

1. cAdvisor 로그 확인: `docker-compose logs cadvisor`
2. 컨테이너가 같은 네트워크에 있는지 확인
3. cAdvisor 재시작: `docker-compose restart cadvisor`

## 권장 임계값

### 개발 환경
- CPU: 90%
- Memory: 90%
- Disk: 85%

### 프로덕션 환경
- CPU: 80%
- Memory: 85%
- Disk: 80%

## 참고 자료

- [Prometheus 공식 문서](https://prometheus.io/docs/)
- [Grafana Alerting 가이드](https://grafana.com/docs/grafana/latest/alerting/)
- [PromQL 쿼리 예제](https://prometheus.io/docs/prometheus/latest/querying/examples/)

