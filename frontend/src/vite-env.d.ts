/// <reference types="vite/client" />

// Window 인터페이스 확장 - Sentry 타입 정의
interface Window {
  Sentry?: {
    captureException: (error: unknown) => void;
    captureMessage: (message: string, options?: {
      level?: 'warning' | 'error' | 'info';
      tags?: Record<string, string>;
    }) => void;
  };
}
