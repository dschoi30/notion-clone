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
  google?: {
    accounts?: {
      id?: {
        initialize: (config: {
          client_id: string;
          callback: (response: { credential: string }) => void;
          ux_mode?: 'popup' | 'redirect';
          context?: 'signin' | 'signup' | 'use';
          auto_select?: boolean;
          itp_support?: boolean;
        }) => void;
        renderButton: (
          element: HTMLElement,
          options: {
            theme?: 'outline' | 'filled_blue' | 'filled_black';
            size?: 'large' | 'medium' | 'small';
            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
            shape?: 'rectangular' | 'pill' | 'circle';
            locale?: string;
            width?: number;
          }
        ) => void;
      };
    };
  };
}
