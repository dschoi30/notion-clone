import React from 'react';
import { AlertTriangle, X, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorMessageFromError, getRetryMessage, isRetryable } from '@/lib/errorUtils';

const ErrorMessage = ({ 
  error, 
  onRetry, 
  onDismiss, 
  variant = 'error',
  showDetails = false,
  className = ''
}) => {
  const getErrorIcon = () => {
    switch (variant) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getErrorColor = () => {
    switch (variant) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-red-200 bg-red-50';
    }
  };

  // 에러 메시지와 재시도 메시지는 유틸 함수에서 가져옴
  const errorMessage = getErrorMessageFromError(error);
  const retryMessage = getRetryMessage(error);
  const canRetry = isRetryable(error);

  return (
    <div className={`p-4 rounded-lg border ${getErrorColor()} ${className}`}>
      <div className="flex gap-3 items-start">
        {getErrorIcon()}
        
        <div className="flex-1 min-w-0">
          <p className="mb-1 text-sm font-medium text-gray-900">
            {errorMessage}
          </p>
          
          {showDetails && error?.response?.data?.message && (
            <p className="mb-2 text-xs text-gray-600">
              {error.response.data.message}
            </p>
          )}
          
          {onRetry && canRetry && (
            <p className="mb-3 text-xs text-gray-500">
              {retryMessage}
            </p>
          )}
          
          <div className="flex gap-2">
            {onRetry && canRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="flex gap-1 items-center text-xs"
              >
                <RefreshCw className="w-3 h-3" />
                다시 시도
              </Button>
            )}
            
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="flex gap-1 items-center text-xs"
              >
                <X className="w-3 h-3" />
                닫기
              </Button>
            )}
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;
