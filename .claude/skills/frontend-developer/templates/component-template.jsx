import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { createLogger } from '@/lib/logger';

const log = createLogger('MyComponent');

/**
 * 컴포넌트 설명: [컴포넌트의 용도와 기능을 설명합니다]
 *
 * @param {Object} props - 컴포넌트 props
 * @param {string} props.title - 제목
 * @param {boolean} props.isOpen - 열림 상태 (기본값: false)
 * @param {Function} props.onClose - 닫기 이벤트 핸들러
 * @param {string|number} props.resourceId - 리소스 ID (React Query 사용 시)
 *
 * @example
 * <MyComponent
 *   title="Example"
 *   isOpen={true}
 *   onClose={() => console.log('closed')}
 *   resourceId={123}
 * />
 */
export function MyComponent({
  title,
  isOpen = false,
  onClose,
  resourceId
}) {
  // ========== Hooks ==========
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const [internalState, setInternalState] = useState(null);

  // ========== React Query ==========
  // 데이터 조회
  const {
    data: items = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['items', resourceId],
    queryFn: () => api.getItems(resourceId),
    enabled: !!resourceId && isOpen,
    staleTime: 1000 * 60 * 2, // 2분
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (queryError) {
      log.error('데이터 조회 실패', queryError);
      handleError(queryError, {
        customMessage: '데이터를 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [queryError, handleError]);

  // 데이터 변경 mutation
  const createMutation = useMutation({
    mutationFn: (itemData) => api.createItem(itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', resourceId] });
    },
    onError: (e) => {
      log.error('아이템 생성 실패', e);
      handleError(e, {
        customMessage: '아이템 생성에 실패했습니다.',
        showToast: true
      });
    },
  });

  // ========== Callbacks ==========
  const handleAction = useCallback(() => {
    // Mutation 사용 예시
    createMutation.mutate({ name: 'New Item' });
  }, [createMutation]);

  const handleClose = useCallback(() => {
    setInternalState(null);
    onClose();
  }, [onClose]);

  // ========== Effects ==========
  useEffect(() => {
    if (isOpen) {
      // 컴포넌트가 열렸을 때 실행할 로직
      setInternalState(null);
    }
  }, [isOpen]);

  useEffect(() => {
    // 정리 함수가 필요한 경우 (예: 타이머, 구독)
    return () => {
      // 정리 로직
    };
  }, []);

  // ========== Render ==========
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* 콘텐츠 */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {queryError && (
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
            <p className="text-red-800 text-sm">{queryError.message}</p>
          </div>
        )}

        {!loading && !queryError && items.length > 0 && (
          <div className="space-y-3 mb-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer"
              >
                {item.name}
              </div>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && !queryError && (
          <p className="text-gray-500 text-center py-8">아이템이 없습니다</p>
        )}

        {/* 푸터 */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleAction}
            disabled={loading || createMutation.isPending}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createMutation.isPending ? '처리 중...' : '확인'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== Sub Components (필요시) ==========
/**
 * 아이템 아이콘 컴포넌트
 */
const ItemIcon = ({ type }) => {
  const iconMap = {
    document: '📄',
    folder: '📁',
    shared: '👥',
  };

  return <span className="text-lg">{iconMap[type] || '📝'}</span>;
};
