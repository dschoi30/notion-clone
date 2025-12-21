import { useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { updatePropertyOrder } from '@/services/documentApi';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import type { DocumentProperty } from '@/types';

interface UsePropertiesDndParams {
  properties: DocumentProperty[];
  setProperties: (properties: DocumentProperty[]) => void;
  workspaceId: number;
  documentId: number;
}

// 공통 속성 DnD 훅: 컬럼(테이블)과 리스트(Page) 모두에서 사용 가능
export function usePropertiesDnd({ 
  properties, 
  setProperties, 
  workspaceId, 
  documentId 
}: UsePropertiesDndParams) {
  const { handleError } = useErrorHandler();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleColumnDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = properties.findIndex((p) => p.id === active.id);
    const newIndex = properties.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newProperties = arrayMove(properties, oldIndex, newIndex);
    setProperties(newProperties);
    try {
      const propertyIds = newProperties.map((p) => p.id);
      await updatePropertyOrder(workspaceId, documentId, propertyIds);
    } catch (err) {
      setProperties(properties);
      handleError(err as Error, {
        customMessage: '속성 순서 변경에 실패했습니다. 다시 시도해주세요.',
        showToast: true
      });
    }
  };

  return { sensors, handleColumnDragEnd };
}

export default usePropertiesDnd;

