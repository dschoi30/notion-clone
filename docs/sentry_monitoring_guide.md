# Sentry 모니터링 가이드

클라우드 Sentry를 사용한 에러 추적 및 성능 모니터링 설정 가이드입니다.

> **중요**: Sentry는 **모든 로그를 수집하지 않습니다**. 에러와 예외만 자동으로 전송됩니다.  
> 일반 로그(debug, info, warn)는 브라우저 콘솔에만 출력되며 Sentry로 전송되지 않습니다.  
> 자세한 내용은 `docs/sentry_logging_difference.md` 참고

## 1. 기본 설정 확인

### 1.1 DSN 설정
`.env` 파일에 클라우드 Sentry DSN을 설정합니다:

```bash
VITE_SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project-id
```

### 1.2 릴리즈 버전 설정
프로덕션 배포 시 버전을 명시하여 릴리즈별 추적이 가능합니다:

```bash
# .env 또는 환경 변수
VITE_APP_VERSION=1.0.0
```

또는 `package.json`의 버전을 자동으로 사용하도록 설정할 수 있습니다.

## 2. Sentry 대시보드에서 확인할 수 있는 지표

### 2.1 Issues (에러 추적)
- **위치**: Sentry 대시보드 → Issues
- **확인 항목**:
  - 에러 발생 빈도
  - 에러별 영향받는 사용자 수
  - 에러 발생 환경 (development/production)
  - 에러 발생 브라우저/OS
  - 스택 트레이스 및 소스맵

### 2.2 Performance (성능 모니터링)
- **위치**: Sentry 대시보드 → Performance
- **확인 항목**:
  - 페이지 로드 시간 (LCP, FCP, TTFB)
  - API 요청 응답 시간
  - 느린 쿼리/트랜잭션
  - 사용자별 성능 분포

### 2.3 Replays (세션 리플레이)
- **위치**: Sentry 대시보드 → Replays
- **확인 항목**:
  - 에러 발생 시 사용자 행동 재현
  - 사용자 클릭, 스크롤, 입력 등
  - 네트워크 요청/응답

### 2.4 Releases (릴리즈 추적)
- **위치**: Sentry 대시보드 → Releases
- **확인 항목**:
  - 릴리즈별 에러 발생률
  - 릴리즈 배포 후 신규 에러
  - 릴리즈별 성능 변화

### 2.5 Users (사용자 추적)
- **위치**: Sentry 대시보드 → Users
- **확인 항목**:
  - 사용자별 에러 발생 이력
  - 사용자별 성능 메트릭
  - 사용자 세션 정보

## 3. 주요 지표 설정 및 확인 방법

### 3.1 알림 설정

#### 3.1.1 이메일 알림
1. Sentry 대시보드 → Settings → Notifications
2. "Email" 활성화
3. 알림 받을 이메일 주소 추가

#### 3.1.2 Slack/이메일 통합
1. Settings → Integrations
2. Slack 또는 다른 서비스 연결
3. 알림 규칙 설정:
   - 새로운 에러 발생 시
   - 에러 빈도 임계값 초과 시
   - 특정 태그/레벨의 에러 발생 시

### 3.2 대시보드 설정

#### 3.2.1 커스텀 대시보드 생성
1. Sentry 대시보드 → Dashboards → Create Dashboard
2. 위젯 추가:
   - **Error Count**: 시간별 에러 발생 수
   - **Affected Users**: 영향받는 사용자 수
   - **Performance**: 평균 응답 시간
   - **Release Health**: 릴리즈별 건강도

#### 3.2.2 추천 위젯
- **Errors by Release**: 릴리즈별 에러 수
- **Top Issues**: 가장 많이 발생하는 에러
- **P95 Response Time**: 95 백분위 응답 시간
- **User Adoption**: 사용자 채택률

### 3.3 알림 규칙 설정

#### 3.3.1 중요 에러 알림
1. Settings → Alerts → Create Alert Rule
2. 조건 설정:
   - **Trigger**: "An issue is created" 또는 "An issue's frequency exceeds X per hour"
   - **Filter**: 
     - Environment: production
     - Level: error 또는 fatal
     - Tags: 특정 태그 (예: `component:frontend`)
3. 액션 설정:
   - 이메일/Slack 알림
   - 특정 팀 멘션

#### 3.3.2 성능 저하 알림
1. Create Alert Rule
2. 조건 설정:
   - **Trigger**: "A performance issue is detected"
   - **Metric**: P95 Response Time > 2초
3. 액션 설정: 성능 팀에 알림

## 4. 코드에서 추가할 수 있는 지표

### 4.1 커스텀 태그 추가

```javascript
import { setSentryTag } from '@/lib/sentry';

// 페이지/컴포넌트별 태그
setSentryTag('page', 'document-editor');
setSentryTag('workspace_id', workspaceId);
setSentryTag('document_id', documentId);
```

### 4.2 커스텀 컨텍스트 추가

```javascript
import { setSentryContext } from '@/lib/sentry';

// API 요청 컨텍스트
setSentryContext('api_request', {
  endpoint: '/api/documents',
  method: 'POST',
  requestId: 'abc123',
});

// 사용자 액션 컨텍스트
setSentryContext('user_action', {
  action: 'create_document',
  workspaceId: '123',
  timestamp: new Date().toISOString(),
});
```

### 4.3 성능 트랜잭션 추적

```javascript
import * as Sentry from '@sentry/react';

// 커스텀 트랜잭션 시작
const transaction = Sentry.startTransaction({
  name: 'Document Save',
  op: 'user.action',
});

// 작업 수행
try {
  await saveDocument(data);
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('internal_error');
  throw error;
} finally {
  transaction.finish();
}
```

### 4.4 비즈니스 이벤트 추적

```javascript
import { captureMessage } from '@/lib/sentry';

// 중요한 비즈니스 이벤트 추적
captureMessage('Document created', {
  level: 'info',
  tags: {
    workspace_id: workspaceId,
    document_type: 'page',
  },
  extra: {
    documentId: newDocument.id,
    userId: user.id,
  },
});
```

## 5. 주요 지표 확인 체크리스트

### 5.1 일일 확인
- [ ] 새로운 에러 발생 여부 확인 (Issues → New)
- [ ] 에러 발생 빈도 확인 (Issues → Frequency)
- [ ] 영향받는 사용자 수 확인 (Issues → Affected Users)

### 5.2 주간 확인
- [ ] 릴리즈별 에러 트렌드 확인 (Releases)
- [ ] 성능 메트릭 트렌드 확인 (Performance)
- [ ] 사용자 채택률 확인 (Users)

### 5.3 배포 후 확인
- [ ] 신규 릴리즈의 에러 발생률 확인
- [ ] 성능 저하 여부 확인
- [ ] 신규 에러 발생 여부 확인

## 6. 실전 활용 예시

### 6.1 API 에러 추적 개선

```javascript
// services/api.js
import { captureException, setSentryContext } from '@/lib/sentry';

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // API 에러를 Sentry에 전송
    if (error.response) {
      setSentryContext('api_error', {
        url: error.config.url,
        method: error.config.method,
        status: error.response.status,
        statusText: error.response.statusText,
      });
      
      // 5xx 에러만 Sentry에 전송 (4xx는 클라이언트 에러)
      if (error.response.status >= 500) {
        captureException(error, {
          tags: {
            api_endpoint: error.config.url,
            http_status: error.response.status,
          },
        });
      }
    }
    return Promise.reject(error);
  }
);
```

### 6.2 사용자 행동 추적

```javascript
// DocumentEditor.jsx
import { setSentryTag, captureMessage } from '@/lib/sentry';

useEffect(() => {
  // 문서 편집 시작 시 태그 설정
  setSentryTag('document_id', documentId);
  setSentryTag('workspace_id', workspaceId);
  
  // 문서 저장 성공 추적
  const handleSave = async () => {
    try {
      await saveDocument();
      captureMessage('Document saved successfully', {
        level: 'info',
        tags: { document_id: documentId },
      });
    } catch (error) {
      // 에러는 자동으로 Sentry에 전송됨
    }
  };
}, [documentId, workspaceId]);
```

## 7. 성능 최적화 팁

### 7.1 샘플링 비율 조정
현재 설정:
- 프로덕션: 10% (tracesSampleRate: 0.1)
- 개발: 100% (tracesSampleRate: 1.0)

비용 절감을 위해 프로덕션 샘플링을 더 낮출 수 있습니다:
```javascript
tracesSampleRate: environment === 'production' ? 0.05 : 1.0, // 5%로 감소
```

### 7.2 세션 리플레이 샘플링
현재 설정:
- 프로덕션: 10% 세션, 100% 에러 시
- 개발: 100% 세션

에러 발생 시에만 리플레이를 수집하도록 설정:
```javascript
replaysSessionSampleRate: 0, // 일반 세션 리플레이 비활성화
replaysOnErrorSampleRate: 1.0, // 에러 발생 시에만 리플레이
```

## 8. 문제 해결

### 8.1 에러가 Sentry에 전송되지 않는 경우
1. DSN이 올바르게 설정되었는지 확인
2. 브라우저 콘솔에서 Sentry 초기화 로그 확인
3. 네트워크 탭에서 Sentry API 요청 확인
4. Sentry 대시보드에서 프로젝트 설정 확인

### 8.2 성능 데이터가 보이지 않는 경우
1. `browserTracingIntegration`이 활성화되었는지 확인
2. `tracesSampleRate`가 0보다 큰지 확인
3. Sentry 대시보드 → Performance에서 데이터 확인

### 8.3 세션 리플레이가 작동하지 않는 경우
1. `replayIntegration`이 활성화되었는지 확인
2. `replaysSessionSampleRate` 또는 `replaysOnErrorSampleRate` 확인
3. 브라우저 콘솔에서 리플레이 관련 에러 확인

## 9. 추가 리소스

- [Sentry 공식 문서](https://docs.sentry.io/)
- [React 통합 가이드](https://docs.sentry.io/platforms/javascript/guides/react/)
- [성능 모니터링 가이드](https://docs.sentry.io/product/performance/)
- [세션 리플레이 가이드](https://docs.sentry.io/product/session-replay/)

