import { useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { updatePropertyOrder } from '@/services/documentApi';

// 공통 속성 DnD 훅: 컬럼(테이블)과 리스트(Page) 모두에서 사용 가능
export function usePropertiesDnd({ properties, setProperties, workspaceId, documentId }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleColumnDragEnd = async (event) => {
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
      console.error('속성 순서 업데이트 실패:', err);
      setProperties(properties);
      alert('속성 순서 변경에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return { sensors, handleColumnDragEnd };
}

export default usePropertiesDnd;


