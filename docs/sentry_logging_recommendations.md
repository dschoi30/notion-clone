# Sentry 로그 수집 권장 사항

Sentry는 **에러 추적 도구**이므로, 모든 로그를 수집하기보다는 **중요한 에러와 예외만 선별적으로 수집**하는 것이 좋습니다.

## 📊 수집 권장 항목

### 1. 자동 수집 (이미 구현됨)

#### 1.1 JavaScript 에러
- ✅ **자동 수집**: `ErrorBoundary`를 통해 React 컴포넌트 에러 자동 캡처
- ✅ **자동 수집**: 전역 에러 핸들러를 통한 예외 자동 캡처
- **위치**: `frontend/src/components/error/ErrorBoundary.jsx`

#### 1.2 네트워크 에러
- ⚠️ **주의**: 5xx 서버 에러는 **백엔드에서 이미 로그를 남기므로**, 프론트엔드 Sentry로 전송하지 않습니다.
- ✅ **권장**: 백엔드 로그는 **Grafana Loki + Promtail**로 수집 (참고: `docs/logging_guide.md`)
- ⚠️ **제외**: 4xx 클라이언트 에러는 사용자 입력 오류이므로 제외
- **위치**: `frontend/src/services/api.js` (인터셉터)

### 2. 수동 수집 권장 항목

#### 2.1 중요한 비즈니스 이벤트

```javascript
import { captureMessage } from '@/lib/sentry';

// 문서 생성 성공
captureMessage('Document created', {
  level: 'info',
  tags: {
    workspace_id: workspaceId,
    document_type: 'page',
  },
});

// 문서 삭제
captureMessage('Document deleted', {
  level: 'info',
  tags: {
    workspace_id: workspaceId,
    document_id: documentId,
  },
});

// 워크스페이스 생성
captureMessage('Workspace created', {
  level: 'info',
  tags: {
    user_id: user.id,
  },
});
```

#### 2.2 인증 관련 이슈

```javascript
import { captureException, captureMessage } from '@/lib/sentry';

// 로그인 실패 (반복 시도)
if (loginAttempts > 3) {
  captureMessage('Multiple login failures', {
    level: 'warning',
    tags: {
      email: email,
      attempts: loginAttempts,
    },
  });
}

// 토큰 갱신 실패
captureException(new Error('Token refresh failed'), {
  tags: {
    user_id: user.id,
    error_type: 'token_refresh',
  },
});
```

#### 2.3 데이터 동기화 문제

```javascript
// WebSocket 연결 실패
captureException(new Error('WebSocket connection failed'), {
  tags: {
    document_id: documentId,
    error_type: 'websocket',
  },
});

// 문서 저장 실패
captureException(error, {
  tags: {
    document_id: documentId,
    workspace_id: workspaceId,
    error_type: 'save_failure',
  },
});
```

#### 2.4 성능 이슈

```javascript
import * as Sentry from '@sentry/react';

// 느린 API 응답 추적
const transaction = Sentry.startTransaction({
  name: 'Slow API Request',
  op: 'http.client',
});

try {
  const response = await api.get('/api/documents');
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('internal_error');
} finally {
  transaction.finish();
}
```

### 3. 수집하지 말아야 할 항목

#### 3.1 일반적인 사용자 액션
- ❌ 페이지 이동
- ❌ 버튼 클릭 (에러가 없는 경우)
- ❌ 폼 입력 (검증 통과)
- ❌ 일반적인 API 호출 성공

#### 3.2 클라이언트 에러 (4xx)
- ❌ 400 Bad Request (잘못된 입력)
- ❌ 401 Unauthorized (토큰 만료 - 정상적인 플로우)
- ❌ 403 Forbidden (권한 없음 - 정상적인 플로우)
- ❌ 404 Not Found (리소스 없음)

**예외**: 반복적인 4xx 에러는 수집 고려
```javascript
// 반복적인 403 에러는 수집
if (error.response?.status === 403 && retryCount > 3) {
  captureException(error, {
    tags: {
      endpoint: error.config.url,
      retry_count: retryCount,
    },
  });
}
```

#### 3.3 디버그 로그
- ❌ `console.log`, `console.debug` 레벨 로그
- ❌ 개발 환경의 일반적인 정보 로그

## 🎯 현재 프로젝트에 추가 권장 사항

### 1. API 인터셉터 개선

`frontend/src/services/api.js`에 추가:

```javascript
import { captureException, setSentryContext } from '@/lib/sentry';

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 5xx 서버 에러만 Sentry에 전송
    if (error.response?.status >= 500) {
      setSentryContext('api_error', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response.status,
        statusText: error.response.statusText,
        requestData: error.config?.data,
        responseData: error.response.data,
      });
      
      captureException(error, {
        tags: {
          api_endpoint: error.config?.url,
          http_status: error.response.status,
          error_type: 'server_error',
        },
      });
    }
    
    // 429 Too Many Requests는 수집 (Rate Limiting 이슈)
    if (error.response?.status === 429) {
      captureMessage('Rate limit exceeded', {
        level: 'warning',
        tags: {
          endpoint: error.config?.url,
          retry_after: error.response.headers['retry-after'],
        },
      });
    }
    
    return Promise.reject(error);
  }
);
```

### 2. 문서 편집 관련 에러 추적

`frontend/src/components/documents/DocumentEditor.jsx`에 추가:

```javascript
import { captureException, setSentryTag } from '@/lib/sentry';

useEffect(() => {
  // 문서 ID 태그 설정
  setSentryTag('document_id', documentId);
  setSentryTag('workspace_id', workspaceId);
}, [documentId, workspaceId]);

// 문서 저장 실패 시
const handleSave = async () => {
  try {
    await saveDocument();
  } catch (error) {
    captureException(error, {
      tags: {
        document_id: documentId,
        workspace_id: workspaceId,
        error_type: 'document_save',
      },
    });
  }
};
```

### 3. WebSocket 연결 문제 추적

`frontend/src/hooks/useDocumentSocket.js`에 추가:

```javascript
import { captureException } from '@/lib/sentry';

// WebSocket 연결 실패
socket.onerror = (error) => {
  captureException(new Error('WebSocket connection error'), {
    tags: {
      document_id: documentId,
      error_type: 'websocket',
    },
  });
};

// WebSocket 연결 끊김
socket.onclose = (event) => {
  if (!event.wasClean) {
    captureException(new Error('WebSocket closed unexpectedly'), {
      tags: {
        document_id: documentId,
        code: event.code,
        reason: event.reason,
      },
    });
  }
};
```

### 4. 권한 관련 에러 추적

```javascript
// 권한 체크 실패
if (!hasPermission) {
  captureMessage('Permission denied', {
    level: 'warning',
    tags: {
      user_id: user.id,
      workspace_id: workspaceId,
      document_id: documentId,
      required_permission: permission,
    },
  });
}
```

## 📈 Sentry 대시보드에서 확인할 지표

### Issues (에러 추적)
- 에러 발생 빈도
- 영향받는 사용자 수
- 에러별 스택 트레이스
- 에러 발생 환경/브라우저

### Performance (성능)
- 페이지 로드 시간
- API 응답 시간
- 느린 트랜잭션

### Replays (세션 리플레이)
- 에러 발생 시 사용자 행동
- 클릭, 스크롤, 입력 등

## 💡 비용 최적화 팁

1. **샘플링 비율 조정**
   - 현재: 프로덕션 10%, 개발 100%
   - 필요시 더 낮춰서 비용 절감 가능

2. **세션 리플레이 제한**
   - 에러 발생 시에만 리플레이 수집
   - 일반 세션 리플레이 비활성화

3. **중요한 에러만 수집**
   - 5xx 서버 에러만 수집
   - 4xx 클라이언트 에러는 제외
   - 일반적인 사용자 액션은 제외

## 🔍 디버깅 팁

### Sentry에서 로그 확인 방법

1. **Issues 탭**
   - 새로운 에러 확인
   - 에러별 상세 정보 확인
   - 스택 트레이스 확인

2. **Performance 탭**
   - 느린 API 요청 확인
   - 페이지 로드 시간 확인

3. **Replays 탭**
   - 에러 발생 시 사용자 행동 재현
   - 클릭, 입력 등 상호작용 확인

## 📝 체크리스트

### 일일 확인
- [ ] 새로운 에러 발생 여부 (Issues → New)
- [ ] 에러 발생 빈도 확인
- [ ] 영향받는 사용자 수 확인

### 주간 확인
- [ ] 에러 트렌드 확인
- [ ] 성능 메트릭 확인
- [ ] 주요 에러 해결 상태 확인

### 배포 후 확인
- [ ] 신규 릴리즈의 에러 발생률
- [ ] 성능 저하 여부
- [ ] 신규 에러 발생 여부

