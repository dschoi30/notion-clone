import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPropertyValuesByDocument,
  addProperty,
  updateProperty,
  addOrUpdatePropertyValue,
} from '@/services/documentApi';
import { useDocumentPropertiesStore } from '@/hooks/useDocumentPropertiesStore';
import { useDocument } from '@/contexts/DocumentContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { createLogger } from '@/lib/logger';
import type { DocumentProperty, DocumentPropertyValue, PropertyValue } from '@/types';
import type { SystemPropExtractorForPage } from '@/components/documents/shared/systemPropTypeMap';

const log = createLogger('usePageData');

interface UsePageDataParams {
  workspaceId: number;
  documentId: number;
  systemPropTypeMap?: Record<string, SystemPropExtractorForPage>;
}

interface EditingHeader {
  id: number | null;
  name: string;
}

interface UsePageDataReturn {
  properties: DocumentProperty[];
  setProperties: (properties: DocumentProperty[]) => void;
  valuesByPropertyId: Record<number, PropertyValue>;
  setValuesByPropertyId: (updater: ((prev: Record<number, PropertyValue>) => Record<number, PropertyValue>) | Record<number, PropertyValue>) => void;
  isLoading: boolean;
  error: string | null;
  fetchPageData: () => Promise<void>;
  editingHeader: EditingHeader;
  setEditingHeader: (header: EditingHeader) => void;
  handleAddProperty: (name: string, type: string) => Promise<void>;
  handleHeaderNameChange: () => Promise<void>;
  handleValueChange: (propertyId: number, value: PropertyValue) => Promise<void>;
}

// PAGE 전용 데이터 훅: 속성/값 로딩, 추가/수정, 인라인 편집 상태 관리
export function usePageData({ workspaceId, documentId, systemPropTypeMap }: UsePageDataParams): UsePageDataReturn {
  const properties = useDocumentPropertiesStore((state) => state.properties);
  const setProperties = useDocumentPropertiesStore((state) => state.setProperties);
  const queryClient = useQueryClient();
  const { fetchDocument } = useDocument();
  const { handleError } = useErrorHandler();

  const [editingHeader, setEditingHeader] = useState<EditingHeader>({ id: null, name: '' });
  // PagePropertyRow에서 헤더 클릭 시 시작 편집을 위한 헬퍼
  const startEditHeader = (id: number, name: string) => setEditingHeader({ id, name });

  // React Query로 속성 값 조회
  const {
    data: propertyValuesData,
    isLoading,
    error: propertyValuesError,
    refetch: refetchPropertyValues,
  } = useQuery<DocumentPropertyValue[]>({
    queryKey: ['page-property-values', workspaceId, documentId],
    queryFn: () => getPropertyValuesByDocument(workspaceId, documentId),
    enabled: !!workspaceId && !!documentId,
    staleTime: 1000 * 60 * 1, // 1분 - 속성 값은 자주 변경됨
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (propertyValuesError) {
      log.error('속성 값 조회 실패', propertyValuesError);
      handleError(propertyValuesError, {
        customMessage: '속성 값을 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [propertyValuesError, handleError]);

  // 속성 값을 propertyId별 객체로 변환
  const valuesByPropertyId = useMemo<Record<number, PropertyValue>>(() => {
    if (!propertyValuesData) return {};
    const valuesObj: Record<number, PropertyValue> = {};
    propertyValuesData.forEach((v) => {
      valuesObj[v.propertyId] = v.value;
    });
    // 시스템 속성은 문서 메타데이터로 덮어쓰기(표시 일관성)
    if (systemPropTypeMap && Array.isArray(properties)) {
      properties.forEach((p) => {
        const fn = systemPropTypeMap[p.type];
        if (typeof fn === 'function') {
          valuesObj[p.id] = fn();
        }
      });
    }
    return valuesObj;
  }, [propertyValuesData, properties, systemPropTypeMap]);

  const error = propertyValuesError?.message || null;

  // fetchPageData는 기존 API와 호환성을 위해 유지 (refetch로 동작)
  const fetchPageData = async () => {
    await refetchPropertyValues();
  };

  // setValuesByPropertyId는 기존 API와 호환성을 위해 제공 (React Query 캐시 업데이트)
  const setValuesByPropertyId = useCallback((updater: ((prev: Record<number, PropertyValue>) => Record<number, PropertyValue>) | Record<number, PropertyValue>) => {
    queryClient.setQueryData<DocumentPropertyValue[]>(['page-property-values', workspaceId, documentId], (oldData) => {
      if (!oldData) return [];
      if (typeof updater === 'function') {
        const currentObj = oldData.reduce<Record<number, PropertyValue>>((acc, v) => {
          acc[v.propertyId] = v.value;
          return acc;
        }, {});
        const newObj = updater(currentObj);
        // 객체를 배열로 변환
        return Object.entries(newObj).map(([propertyId, value]) => ({
          propertyId: Number(propertyId),
          value,
          id: 0,
          documentId,
        }));
      }
      // 객체인 경우
      return Object.entries(updater).map(([propertyId, value]) => ({
        propertyId: Number(propertyId),
        value,
        id: 0,
        documentId,
      }));
    });
  }, [queryClient, workspaceId, documentId]);

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
  }, [systemPropTypeMap, properties, setValuesByPropertyId]);

  const handleAddProperty = async (name: string, type: string) => {
    if (!name || !type) return;
    try {
      const newProperty = await addProperty(workspaceId, documentId, {
        name,
        type: type as any,
        sortOrder: properties.length,
      });
      // 초기 값 결정 및 저장
      let newValue: PropertyValue = '';
      if (systemPropTypeMap && systemPropTypeMap[type]) {
        newValue = systemPropTypeMap[type]();
      }
      await addOrUpdatePropertyValue(workspaceId, documentId, newProperty.id, newValue);
      
      // zustand store에 속성 추가
      setProperties([...properties, newProperty]);
      
      // React Query 캐시에 새 속성 값 추가
      queryClient.setQueryData<DocumentPropertyValue[]>(['page-property-values', workspaceId, documentId], (oldData) => {
        if (!oldData) return [{ propertyId: newProperty.id, value: newValue, id: 0, documentId }];
        return [...oldData, { propertyId: newProperty.id, value: newValue, id: 0, documentId }];
      });
    } catch (e) {
      log.error('handleAddProperty 에러', e);
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

  const handleValueChange = async (propertyId: number, value: PropertyValue) => {
    // 낙관적 업데이트: React Query 캐시 즉시 업데이트
    queryClient.setQueryData<DocumentPropertyValue[]>(['page-property-values', workspaceId, documentId], (oldData) => {
      if (!oldData) return [{ propertyId, value, id: 0, documentId }];
      const existing = oldData.find((v) => v.propertyId === propertyId);
      if (existing) {
        return oldData.map((v) => (v.propertyId === propertyId ? { ...v, value } : v));
      } else {
        return [...oldData, { propertyId, value, id: 0, documentId }];
      }
    });
    
    try {
      await addOrUpdatePropertyValue(workspaceId, documentId, propertyId, value);
      // 시스템 속성 최신화 반영: 값 저장 후 문서 메타 재조회(silent, apply=false로 전역 오염 방지)
      if (documentId) {
        fetchDocument(documentId, { silent: true, apply: false });
      }
    } catch (e) {
      log.error('handleValueChange 에러', e);
      handleError(e, {
        customMessage: '값 저장에 실패했습니다.',
        showToast: true
      });
      // 에러 시 캐시 무효화하여 원래 상태로 복구
      queryClient.invalidateQueries({ queryKey: ['page-property-values', workspaceId, documentId] });
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

