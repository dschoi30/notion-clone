// src/lib/sentry.js
import * as Sentry from '@sentry/react';

/**
 * Sentry 초기화
 * 환경 변수에서 DSN을 가져와서 초기화합니다.
 */
export function initSentry() {
  const environment = import.meta.env.MODE || 'dev';
  // 릴리즈 버전: 환경 변수 또는 package.json 버전 사용
  const release = import.meta.env.VITE_APP_VERSION || 'unknown';

  // 환경 변수에서 DSN 읽기
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    if (environment === 'dev') {
      console.warn('Sentry DSN이 설정되지 않았습니다. 에러 추적이 비활성화됩니다.');
    }
    return;
  }

  // DSN 마스킹 (보안: 로그에 전체 DSN이 노출되지 않도록)
  const maskedDsn = dsn.length > 8 ? `${dsn.substring(0, 4)}...${dsn.substring(dsn.length - 4)}` : '****';
  if (environment === 'dev') {
    console.log(`Sentry 초기화됨 (DSN: ${maskedDsn})`);
  }

  const sentryOptions = {
    dsn,
    environment,
    release,
    
    // 샘플링 비율 (0.0 ~ 1.0)
    // 프로덕션에서는 10%만 추적하여 비용 절감
    tracesSampleRate: environment === 'prod' ? 0.1 : 1.0,
    
    // 세션 리플레이 설정 (프로덕션에서만 활성화)
    replaysSessionSampleRate: environment === 'prod' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    
    // 통합 기능 설정
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // 에러 필터링 (개발 환경에서 일부 에러 무시)
    beforeSend(event, hint) {
      // 개발 환경에서는 일부 에러를 무시
      if (environment === 'dev') {
        // React 개발 모드 경고는 무시
        if (event.message?.includes('Warning:') || 
            event.message?.includes('ReactDOM')) {
          return null;
        }
      }
      return event;
    },
    
    // 사용자 컨텍스트 설정
    initialScope: {
      tags: {
        component: 'frontend',
      },
    },
  };
  
  Sentry.init(sentryOptions);
}

/**
 * 사용자 컨텍스트 설정
 * @param {object} user - 사용자 정보 { id, email, username 등 }
 */
export function setSentryUser(user) {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id?.toString(),
    email: user.email,
    username: user.username || user.name,
  });
}

/**
 * 커스텀 태그 설정
 * @param {string} key - 태그 키
 * @param {string} value - 태그 값
 */
export function setSentryTag(key, value) {
  Sentry.setTag(key, value);
}

/**
 * 커스텀 컨텍스트 설정
 * @param {string} key - 컨텍스트 키
 * @param {object} context - 컨텍스트 데이터
 */
export function setSentryContext(key, context) {
  Sentry.setContext(key, context);
}

/**
 * 수동으로 에러 캡처
 * @param {Error} error - 에러 객체
 * @param {object} context - 추가 컨텍스트 { tags, extra 등 }
 */
export function captureException(error, context = {}) {
  Sentry.withScope((scope) => {
    if (context.tags) {
      Object.keys(context.tags).forEach(key => {
        scope.setTag(key, context.tags[key]);
      });
    }
    if (context.extra) {
      scope.setExtras(context.extra);
    }
    Sentry.captureException(error);
  });
}

/**
 * 커스텀 메시지 캡처
 * @param {string} message - 메시지
 * @param {string|object} levelOrOptions - 로그 레벨 (info, warning, error) 또는 옵션 객체
 * @param {object} options - 옵션 객체 (level이 문자열인 경우)
 */
export function captureMessage(message, levelOrOptions = 'info', options = {}) {
  if (typeof levelOrOptions === 'object') {
    // 두 번째 인자가 옵션 객체인 경우
    const opts = levelOrOptions;
    Sentry.withScope((scope) => {
      if (opts.level) {
        scope.setLevel(opts.level);
      }
      if (opts.tags) {
        Object.keys(opts.tags).forEach(key => {
          scope.setTag(key, opts.tags[key]);
        });
      }
      if (opts.extra) {
        scope.setExtras(opts.extra);
      }
      Sentry.captureMessage(message, opts.level || 'info');
    });
  } else {
    // 두 번째 인자가 level 문자열인 경우
    Sentry.captureMessage(message, levelOrOptions);
  }
}

