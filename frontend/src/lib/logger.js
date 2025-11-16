// src/lib/logger.js
import log from 'loglevel';

// 환경 변수에서 로그 레벨 가져오기
const getLogLevel = () => {
  const envLevel = import.meta.env.VITE_LOG_LEVEL?.toUpperCase();
  if (envLevel && ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'].includes(envLevel)) {
    return envLevel.toLowerCase();
  }
  return import.meta.env.DEV ? 'debug' : 'info';
};

// loglevel 설정
log.setLevel(getLogLevel());

// 개발 환경 여부
const isDev = Boolean(import.meta.env.DEV);

// Namespace 필터링 설정 (모듈 로드 시 한 번만 계산)
const namespaceFilter = (() => {
  const envNs = String(import.meta.env.VITE_DEBUG_NS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  let runtimeNs = [];
  try {
    const params = new URLSearchParams(window.location.search);
    const queryNs = String(params.get('debug') ?? '');
    const storageNs = String(localStorage.getItem('DEBUG') ?? '');
    runtimeNs = (queryNs + ',' + storageNs)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch (err) {
    // 개발 환경에서만 경고 로그 출력
    if (import.meta.env.DEV) {
      console.warn('Failed to read runtime debug config:', err.message);
    }
    runtimeNs = [];
  }

  return { envNs, runtimeNs };
})();

// 런타임 네임스페이스 필터 갱신 함수 (필요 시 호출)
const updateRuntimeNamespaceFilter = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const queryNs = String(params.get('debug') ?? '');
    const storageNs = String(localStorage.getItem('DEBUG') ?? '');
    namespaceFilter.runtimeNs = (queryNs + ',' + storageNs)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('Failed to update runtime debug config:', err.message);
    }
    namespaceFilter.runtimeNs = [];
  }
};

// 로그 포맷터
const formatLog = (level, namespace, message, meta = {}) => {
  const timestamp = new Date().toLocaleTimeString('ko-KR', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });

  const namespaceStr = namespace ? `[${namespace}]` : '';
  
  if (isDev) {
    // 개발 환경: 읽기 쉬운 포맷
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level.toUpperCase()} ${namespaceStr} ${message}${metaStr}`;
  } else {
    // 프로덕션 환경: JSON 포맷
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      namespace,
      message,
      ...meta,
    });
  }
};

/**
 * 네임스페이스별 로거 생성
 * @param {string} namespace - 로거 네임스페이스
 * @returns {object} 로거 객체 (debug, info, warn, error 메서드 포함)
 */
export function createLogger(namespace) {
  // 런타임 필터 갱신 (URL이나 localStorage 변경 가능성 고려)
  updateRuntimeNamespaceFilter();
  const { envNs, runtimeNs } = namespaceFilter;
  
  // 네임스페이스 필터링
  const nsEnabled =
    envNs.length === 0 ||
    envNs.includes(namespace) ||
    runtimeNs.includes(namespace) ||
    runtimeNs.includes('*');

  // 개발 환경에서만 네임스페이스 필터링 적용
  const enabled = isDev ? nsEnabled : true;

  // 로그 메서드 생성
  const createLogMethod = (level) => {
    return (message, ...args) => {
      if (!enabled && isDev) {
        return;
      }

      // 메타데이터 추출
      const meta = {};
      if (args.length > 0) {
        // 마지막 인자가 객체이고 에러가 아닌 경우 메타데이터로 처리
        const lastArg = args[args.length - 1];
        if (typeof lastArg === 'object' && lastArg !== null && !(lastArg instanceof Error)) {
          Object.assign(meta, lastArg);
          args = args.slice(0, -1);
        }
      }

      // 에러 객체 처리
      const errors = args.filter(arg => arg instanceof Error);
      if (errors.length > 0) {
        const error = errors[0];
        meta.error = {
          message: error.message,
          stack: error.stack,
          name: error.name,
        };
      }

      // 네임스페이스를 메타데이터에 추가
      meta.namespace = namespace;

      // 로그 메시지 생성
      const logMessage = args.length > 0 && typeof args[0] === 'string' 
        ? `${message} ${args.join(' ')}`
        : message;

      // 포맷된 로그 메시지
      const formattedMessage = formatLog(level, namespace, logMessage, meta);

      // loglevel로 로그 출력
      const logMethod = log[level] || log.info;
      logMethod(formattedMessage);

      // 에러가 있으면 추가로 출력
      if (errors.length > 0 && level === 'error') {
        console.error(...errors);
      }
    };
  };

  return {
    enabled,
    debug: createLogMethod('debug'),
    info: createLogMethod('info'),
    warn: createLogMethod('warn'),
    error: createLogMethod('error'),
  };
}

// 기본 로거 내보내기
export const logger = createLogger('app');
