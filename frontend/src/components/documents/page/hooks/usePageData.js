import { useEffect, useState } from 'react';
import {
  getProperties,
  getPropertyValuesByDocument,
  addProperty,
  updateProperty,
  addOrUpdatePropertyValue,
} from '@/services/documentApi';
import { useDocumentPropertiesStore } from '@/hooks/useDocumentPropertiesStore';
import { useDocument } from '@/contexts/DocumentContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';

// PAGE 전용 데이터 훅: 속성/값 로딩, 추가/수정, 인라인 편집 상태 관리
export function usePageData({ workspaceId, documentId, systemPropTypeMap }) {
  const properties = useDocumentPropertiesStore((state) => state.properties);
  const setProperties = useDocumentPropertiesStore((state) => state.setProperties);
  const { fetchDocument } = useDocument();
  const { handleError } = useErrorHandler();

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
      // 시스템 속성은 문서 메타데이터로 덮어쓰기(표시 일관성)
      if (systemPropTypeMap && Array.isArray(props)) {
        props.forEach((p) => {
          const fn = systemPropTypeMap[p.type];
          if (typeof fn === 'function') {
            valuesObj[p.id] = fn();
          }
        });
      }
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

  // 문서 메타데이터 변경 시(= systemPropTypeMap 변경 시) 시스템 속성 표시값 동기화
  useEffect(() => {
    if (!systemPropTypeMap || !properties?.length) return;
    setValuesByPropertyId((prev) => {
      let changed = false;
      const next = { ...prev };
      properties.forEach((p) => {
        const fn = systemPropTypeMap[p.type];
        if (typeof fn === 'function') {
          const computed = fn();
          if (next[p.id] !== computed) {
            next[p.id] = computed;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [systemPropTypeMap, properties]);

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
      handleError(e, {
        customMessage: '속성 추가에 실패했습니다.',
        showToast: true
      });
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
      handleError(e, {
        customMessage: '속성 이름 변경에 실패했습니다.',
        showToast: true
      });
    } finally {
      setEditingHeader({ id: null, name: '' });
    }
  };

  const handleValueChange = async (propertyId, value) => {
    setValuesByPropertyId((prev) => ({ ...prev, [propertyId]: value }));
    try {
      await addOrUpdatePropertyValue(workspaceId, documentId, propertyId, value);
      // 시스템 속성 최신화 반영: 값 저장 후 문서 메타 재조회(silent, apply=false로 전역 오염 방지)
      if (documentId) {
        fetchDocument(documentId, { silent: true, apply: false });
      }
    } catch (e) {
      handleError(e, {
        customMessage: '값 저장에 실패했습니다.',
        showToast: true
      });
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


