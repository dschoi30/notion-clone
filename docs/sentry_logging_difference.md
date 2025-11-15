# Sentry vs 일반 로깅 시스템 차이점

## 핵심 차이점

### 1. 일반 로깅 (`logger.js`)
- **용도**: 개발/디버깅용 로그 출력
- **대상**: 브라우저 콘솔에만 출력
- **전송**: Sentry로 전송되지 않음
- **레벨**: debug, info, warn, error 모두 출력

```javascript
import { createLogger } from '@/lib/logger';

const logger = createLogger('MyComponent');
logger.debug('디버그 메시지');  // ❌ Sentry로 전송 안 됨
logger.info('정보 메시지');     // ❌ Sentry로 전송 안 됨
logger.warn('경고 메시지');     // ❌ Sentry로 전송 안 됨
logger.error('에러 메시지');    // ❌ Sentry로 전송 안 됨 (콘솔에만 출력)
```

### 2. Sentry 에러 추적 (`sentry.js`)
- **용도**: 프로덕션 에러 모니터링 및 성능 추적
- **대상**: Sentry 클라우드로 전송
- **전송**: 에러와 예외만 전송
- **레벨**: error, fatal만 자동 캡처

## Sentry에 자동으로 전송되는 것

### ✅ 자동 캡처
1. **JavaScript 에러/예외**
   ```javascript
   // 자동으로 Sentry에 전송됨
   throw new Error('에러 발생');
   ```

2. **React ErrorBoundary에서 잡힌 에러**
   ```javascript
   // ErrorBoundary.jsx에서 자동 전송
   componentDidCatch(error, errorInfo) {
     captureException(error, { errorInfo });
   }
   ```

3. **처리되지 않은 Promise 거부**
   ```javascript
   // 자동으로 Sentry에 전송됨
   Promise.reject(new Error('Promise 에러'));
   ```

4. **성능 트랜잭션** (샘플링)
   - 프로덕션: 10% 샘플링
   - 개발: 100% 샘플링

5. **세션 리플레이** (샘플링)
   - 프로덕션: 10% 세션, 100% 에러 시
   - 개발: 100% 세션

### ❌ 자동으로 전송되지 않는 것
1. **일반 로그 메시지**
   ```javascript
   logger.info('사용자 로그인');  // ❌ 전송 안 됨
   logger.debug('API 호출');      // ❌ 전송 안 됨
   logger.warn('경고 메시지');    // ❌ 전송 안 됨
   ```

2. **수동으로 처리한 에러**
   ```javascript
   try {
     // 에러 발생
   } catch (error) {
     logger.error('에러 발생:', error);  // ❌ Sentry로 전송 안 됨
     // Sentry에 전송하려면 captureException() 호출 필요
   }
   ```

## Sentry에 수동으로 전송하는 방법

### 1. 에러 전송
```javascript
import { captureException } from '@/lib/sentry';

try {
  // 작업 수행
} catch (error) {
  // 로컬 로깅
  logger.error('에러 발생:', error);
  
  // Sentry에 전송
  captureException(error, {
    tags: { component: 'MyComponent' },
    extra: { userId: user.id },
  });
}
```

### 2. 커스텀 메시지 전송
```javascript
import { captureMessage } from '@/lib/sentry';

// 중요한 이벤트만 Sentry에 전송
captureMessage('중요한 비즈니스 이벤트', {
  level: 'info',
  tags: { event_type: 'user_action' },
});
```

## 현재 프로젝트에서의 사용 예시

### ErrorBoundary.jsx
```javascript
componentDidCatch(error, errorInfo) {
  // 1. 로컬 로깅 (콘솔에만 출력)
  this.logger.error('ErrorBoundary caught an error:', error, errorInfo);
  
  // 2. Sentry에 전송 (클라우드로 전송)
  captureException(error, {
    errorInfo,
    componentStack: errorInfo.componentStack,
  });
}
```

### 일반 컴포넌트
```javascript
// ❌ 이렇게 하면 Sentry로 전송 안 됨
const logger = createLogger('MyComponent');
logger.error('에러 발생:', error);

// ✅ 이렇게 해야 Sentry로 전송됨
import { captureException } from '@/lib/sentry';
captureException(error);
```

## 로그 수집 전략

### 일반 로그 (logger.js)
- **목적**: 개발/디버깅
- **저장 위치**: 브라우저 콘솔
- **용도**: 
  - 개발 중 디버깅
  - 로컬 문제 해결
  - 상세한 실행 흐름 추적

### Sentry (sentry.js)
- **목적**: 프로덕션 모니터링
- **저장 위치**: Sentry 클라우드
- **용도**:
  - 프로덕션 에러 추적
  - 성능 모니터링
  - 사용자 영향도 분석
  - 릴리즈별 에러 추적

## 권장 사용 패턴

### 1. 일반 로그는 개발용으로만
```javascript
// 개발 중 디버깅용
logger.debug('상태 업데이트:', state);
logger.info('API 요청:', { url, method });
```

### 2. 에러는 로컬 로깅 + Sentry 전송
```javascript
try {
  await saveDocument();
} catch (error) {
  // 로컬 로깅 (개발자용)
  logger.error('문서 저장 실패:', error);
  
  // Sentry 전송 (모니터링용)
  captureException(error, {
    tags: { action: 'save_document' },
    extra: { documentId: doc.id },
  });
}
```

### 3. 중요한 이벤트만 Sentry에 전송
```javascript
// ❌ 너무 많은 메시지 전송 (비용 증가)
captureMessage('사용자 클릭');
captureMessage('버튼 호버');

// ✅ 중요한 이벤트만 전송
captureMessage('문서 생성 완료', {
  level: 'info',
  tags: { event: 'document_created' },
});
```

## 요약

| 항목 | 일반 로그 (logger) | Sentry |
|------|-------------------|--------|
| **전송 대상** | 브라우저 콘솔 | Sentry 클라우드 |
| **자동 전송** | ❌ 없음 | ✅ 에러만 자동 |
| **로그 레벨** | debug, info, warn, error | error, fatal |
| **용도** | 개발/디버깅 | 프로덕션 모니터링 |
| **비용** | 무료 | 사용량 기반 |

**결론**: 일반 로그는 Sentry로 전송되지 않습니다. 에러와 예외만 Sentry에 전송되며, 일반 로그는 브라우저 콘솔에만 출력됩니다.


