# 에러 처리 시스템 구조

## 📁 파일 구조 및 역할

### 1. `errorUtils.js` (공통 유틸리티)
**위치**: `frontend/src/lib/errorUtils.js`
**역할**: 에러 처리 관련 순수 함수들
**기능**:
- `getErrorMessageFromError()`: 에러 객체를 사용자 친화적 메시지로 변환
- `getErrorType()`: 에러 타입 판별 (network, timeout, server, client, unknown)
- `getErrorSeverity()`: 에러 심각도 판별 (low, medium, high, critical)
- `isRetryable()`: 재시도 가능 여부 판별
- `getRetryMessage()`: 재시도 안내 메시지 생성

### 2. `useErrorHandler.js` (에러 처리 훅)
**위치**: `frontend/src/hooks/useErrorHandler.js`
**역할**: 에러 상태 관리 및 처리 로직
**기능**:
- 에러 상태 관리 (`error`, `setError`)
- Toast 메시지 표시
- 에러 처리 옵션 설정 (showToast, customMessage, onError 등)
- `createErrorHandler()`: 특정 에러 타입별 처리 함수 생성

### 3. `ErrorMessage.jsx` (에러 표시 컴포넌트)
**위치**: `frontend/src/components/error/ErrorMessage.jsx`
**역할**: 에러를 시각적으로 표시하는 UI 컴포넌트
**기능**:
- 에러 메시지 렌더링
- 아이콘 표시 (error, warning, info)
- 버튼 제공 (다시 시도, 닫기)
- 재시도 가능 여부에 따른 UI 조정

### 4. `ErrorBoundary.jsx` (에러 경계)
**위치**: `frontend/src/components/error/ErrorBoundary.jsx`
**역할**: React 컴포넌트 트리에서 예상치 못한 에러를 캐치
**기능**:
- JavaScript 에러 캐치
- 폴백 UI 렌더링
- 에러 로깅
- 개발/운영 환경 구분

## 🔄 사용 패턴

### 기본 사용법
```jsx
import { useErrorHandler } from '@/hooks/useErrorHandler';
import ErrorMessage from '@/components/error/ErrorMessage';

const MyComponent = () => {
  const { error, handleError, clearError } = useErrorHandler();
  
  const handleAction = async () => {
    try {
      await someApiCall();
    } catch (error) {
      handleError(error, {
        customMessage: '사용자 정의 메시지',
        showToast: true
      });
    }
  };
  
  return (
    <div>
      {error && (
        <ErrorMessage 
          error={error} 
          onRetry={handleAction}
          onDismiss={clearError}
        />
      )}
    </div>
  );
};
```

### 고급 사용법
```jsx
import { useErrorHandler, createErrorHandler } from '@/hooks/useErrorHandler';
import { getErrorType, getErrorSeverity } from '@/lib/errorUtils';

const MyComponent = () => {
  const { handleError } = useErrorHandler();
  
  const handleAction = async () => {
    try {
      await someApiCall();
    } catch (error) {
      const errorType = getErrorType(error);
      const severity = getErrorSeverity(error);
      
      // 특정 에러 타입별 처리
      const handler = createErrorHandler(errorType);
      const result = handler(error, { context: 'MyComponent' });
      
      handleError(error, {
        customMessage: result.message,
        showToast: severity === 'high',
        onError: (err) => {
          // 추가 에러 처리 로직
          console.log('Custom error handling:', err);
        }
      });
    }
  };
};
```

## 🎯 설계 원칙

1. **단일 책임 원칙**: 각 파일은 명확한 하나의 역할만 담당
2. **DRY 원칙**: 중복 코드 제거, 공통 로직은 유틸 함수로 분리
3. **재사용성**: 컴포넌트와 훅은 다양한 상황에서 재사용 가능
4. **확장성**: 새로운 에러 타입이나 처리 방식 쉽게 추가 가능
5. **사용자 경험**: 일관된 에러 메시지와 복구 액션 제공

## 📝 에러 메시지 매핑

| HTTP 상태 코드 | 사용자 메시지 | 재시도 가능 |
|---------------|--------------|------------|
| 400 | 잘못된 요청입니다. 입력한 정보를 확인해주세요. | ❌ |
| 401 | 로그인이 필요합니다. 다시 로그인해주세요. | ❌ |
| 403 | 접근 권한이 없습니다. 관리자에게 문의해주세요. | ❌ |
| 404 | 요청한 리소스를 찾을 수 없습니다. | ❌ |
| 409 | 이미 존재하는 데이터입니다. | ❌ |
| 422 | 입력한 데이터에 오류가 있습니다. | ❌ |
| 429 | 요청이 너무 많습니다. 잠시 후 다시 시도해주세요. | ✅ |
| 500 | 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요. | ✅ |
| 502, 503, 504 | 서버가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요. | ✅ |

## 🔧 확장 방법

### 새로운 에러 타입 추가
1. `errorUtils.js`에 새로운 에러 타입 처리 로직 추가
2. `useErrorHandler.js`의 `createErrorHandler`에 새로운 핸들러 추가
3. 필요시 `ErrorMessage.jsx`에 새로운 UI 변형 추가

### 새로운 에러 처리 옵션 추가
1. `useErrorHandler.js`의 `handleError` 함수에 새로운 옵션 추가
2. `ErrorMessage.jsx`에 새로운 props 추가
3. 문서 업데이트
