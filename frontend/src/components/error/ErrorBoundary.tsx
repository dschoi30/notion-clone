import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getReactErrorMessage } from '@/lib/errorUtils';
import { createLogger } from '@/lib/logger';
import { captureException } from '@/lib/sentry';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  private logger = createLogger('ErrorBoundary');

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // 다음 렌더링에서 폴백 UI가 보이도록 상태를 업데이트합니다.
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 에러 로깅 서비스에 에러를 기록할 수 있습니다.
    this.logger.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Sentry에 에러 전송
    captureException(error, {
      errorInfo,
      componentStack: errorInfo.componentStack,
    });
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  getErrorMessage = () => {
    const { error } = this.state;
    if (!error) {
      return {
        title: '알 수 없는 오류',
        description: '오류가 발생했습니다.'
      };
    }
    
    const errorInfo = getReactErrorMessage(error);
    
    // 세션 만료인 경우 자동 리다이렉트
    if (errorInfo.shouldRedirect) {
      const delay = errorInfo.redirectDelay || 2000;
      setTimeout(() => {
        try {
          window.location.href = '/login';
        } catch (redirectError) {
          this.logger.error('리다이렉트 실패:', redirectError);
        }
      }, delay);
    }
    
    return {
      title: errorInfo.title,
      description: errorInfo.description
    };
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.getErrorMessage();
      
      // 폴백 UI를 렌더링합니다.
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <AlertTriangle className="h-16 w-16 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {errorMessage.title}
            </h1>
            
            <p className="text-gray-600 mb-6">
              {errorMessage.description}
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  개발자 정보 (클릭하여 확장)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-40">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <Button 
                onClick={this.handleRetry}
                variant="default"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                다시 시도
              </Button>
              
              <Button 
                onClick={this.handleGoHome}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                홈으로 이동
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

