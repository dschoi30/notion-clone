import { useState, useCallback, useEffect } from 'react';

/**
 * 컴포넌트 설명: [컴포넌트의 용도와 기능을 설명합니다]
 *
 * @param {Object} props - 컴포넌트 props
 * @param {string} props.title - 제목
 * @param {boolean} props.isOpen - 열림 상태 (기본값: false)
 * @param {Function} props.onClose - 닫기 이벤트 핸들러
 * @param {Array} props.items - 아이템 배열
 *
 * @example
 * <MyComponent
 *   title="Example"
 *   isOpen={true}
 *   onClose={() => console.log('closed')}
 *   items={[{ id: 1, name: 'Item 1' }]}
 * />
 */
export function MyComponent({
  title,
  isOpen = false,
  onClose,
  items = []
}) {
  // ========== State ==========
  const [internalState, setInternalState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ========== Callbacks ==========
  const handleAction = useCallback(() => {
    // 액션 구현
  }, []);

  const handleClose = useCallback(() => {
    setInternalState(null);
    onClose();
  }, [onClose]);

  // ========== Effects ==========
  useEffect(() => {
    if (isOpen) {
      // 컴포넌트가 열렸을 때 실행할 로직
      setInternalState(null);
      setError(null);
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
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

        {!loading && items.length === 0 && !error && (
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
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            확인
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
