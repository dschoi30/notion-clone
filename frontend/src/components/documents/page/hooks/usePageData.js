import { useEffect, useState } from 'react';
import {
  getProperties,
  getPropertyValuesByDocument,
  addProperty,
  updateProperty,
  addOrUpdatePropertyValue,
} from '@/services/documentApi';
import { useDocumentPropertiesStore } from '@/hooks/useDocumentPropertiesStore';

// PAGE 전용 데이터 훅: 속성/값 로딩, 추가/수정, 인라인 편집 상태 관리
export function usePageData({ workspaceId, documentId, systemPropTypeMap }) {
  const properties = useDocumentPropertiesStore((state) => state.properties);
  const setProperties = useDocumentPropertiesStore((state) => state.setProperties);

  const [valuesByPropertyId, setValuesByPropertyId] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [editingHeader, setEditingHeader] = useState({ id: null, name: '' });
  // PagePropertyRow에서 헤더 클릭 시 시작 편집을 위한 헬퍼
  const startEditHeader = (id, name) => setEditingHeader({ id, name });

  async function fetchPageData() {
    if (!workspaceId || !documentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const props = await getProperties(workspaceId, documentId);
      setProperties(props);
      const valuesArr = await getPropertyValuesByDocument(workspaceId, documentId);
      const valuesObj = {};
      valuesArr.forEach((v) => {
        valuesObj[v.propertyId] = v.value;
      });
      setValuesByPropertyId(valuesObj);
    } catch (err) {
      setError(err);
      console.error('PAGE 데이터 로딩 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();
  }, [workspaceId, documentId]);

  const handleAddProperty = async (name, type) => {
    if (!name || !type) return;
    try {
      const newProperty = await addProperty(workspaceId, documentId, {
        name,
        type,
        sortOrder: properties.length,
      });
      // 초기 값 결정 및 저장
      let newValue = '';
      if (systemPropTypeMap && systemPropTypeMap[type]) {
        newValue = systemPropTypeMap[type]();
      }
      await addOrUpdatePropertyValue(workspaceId, documentId, newProperty.id, newValue);
      // 낙관적 반영
      setProperties([...properties, newProperty]);
      setValuesByPropertyId((prev) => ({ ...prev, [newProperty.id]: newValue }));
    } catch (e) {
      alert('속성 추가 실패');
    }
  };

  const handleHeaderNameChange = async () => {
    if (!editingHeader.id || !editingHeader.name) {
      setEditingHeader({ id: null, name: '' });
      return;
    }
    try {
      await updateProperty(workspaceId, editingHeader.id, editingHeader.name);
      const updated = properties.map((p) => (p.id === editingHeader.id ? { ...p, name: editingHeader.name } : p));
      setProperties(updated);
    } catch (e) {
      alert('속성 이름 변경 실패');
    } finally {
      setEditingHeader({ id: null, name: '' });
    }
  };

  const handleValueChange = async (propertyId, value) => {
    setValuesByPropertyId((prev) => ({ ...prev, [propertyId]: value }));
    try {
      await addOrUpdatePropertyValue(workspaceId, documentId, propertyId, value);
    } catch (e) {
      alert('값 저장 실패');
    }
  };

  return {
    properties,
    setProperties,
    valuesByPropertyId,
    setValuesByPropertyId,
    isLoading,
    error,
    fetchPageData,
    editingHeader,
    setEditingHeader,
    handleAddProperty,
    handleHeaderNameChange,
    handleValueChange,
  };
}

export default usePageData;


