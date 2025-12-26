import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProperties,
  addProperty,
  updateProperty,
  deleteProperty,
  addOrUpdatePropertyValue,
  getPropertyValuesByChildDocuments,
  getChildDocumentsPaged,
  updateChildDocumentOrder,
} from '@/services/documentApi';
import { useDocument } from '@/contexts/DocumentContext';
import { useAuth } from '@/contexts/AuthContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { createLogger } from '@/lib/logger';
import type { Document, DocumentProperty, DocumentPropertyValue, PropertyValue } from '@/types';
import type { SystemPropExtractor } from '@/components/documents/shared/systemPropTypeMap';
import type { TableRowData } from '@/components/documents/shared/constants';

const log = createLogger('useTableData');

interface EditingHeader {
  id: number | null;
  name: string;
}

interface ServerSortParams {
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  propId?: number;
}

interface UseTableDataParams {
  workspaceId: number;
  documentId: number;
  systemPropTypeMap: Record<string, SystemPropExtractor>;
}

interface InfiniteQueryPage {
  children: Document[];
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export function useTableData({ workspaceId, documentId, systemPropTypeMap }: UseTableDataParams) {
  const [editingHeader, setEditingHeader] = useState<EditingHeader>({ id: null, name: '' });
  const queryClient = useQueryClient();
  const { createDocument, updateDocument, currentDocument } = useDocument();
  const { user } = useAuth();
  const { handleError } = useErrorHandler();

  // 시스템 속성 맵은 참조 안정화를 위해 캡처
  const stableSystemMap = useMemo(() => systemPropTypeMap || {}, [systemPropTypeMap]);

  // 서버 정렬 파라미터 계산 (title/createdAt/updatedAt만 서버 정렬 지원)
  // useTableSort와 동일한 키로 저장된 정렬을 읽어 서버 정렬 파라미터 산출
  const getServerSortParams = useCallback((): ServerSortParams => {
    try {
      if (!user?.id || !documentId) return {};
      const key = `tableSort_${user.id}_${documentId}`;
      const stored = localStorage.getItem(key);
      const sorts = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(sorts) || sorts.length === 0) return {};
      const s = sorts[0] as { propertyId: number; propertyType: string; propertyName?: string; order: 'asc' | 'desc' };
      // 이름(Title)
      if ((s.propertyId === 0 && s.propertyType === 'TEXT') || s.propertyName === '이름') {
        return { sortField: 'title', sortDir: s.order };
      }
      if (s.propertyType === 'CREATED_AT') return { sortField: 'createdAt', sortDir: s.order };
      if (s.propertyType === 'LAST_UPDATED_AT') return { sortField: 'updatedAt', sortDir: s.order };
      // 사용자 정의 속성: 텍스트/숫자/날짜/생성자/수정자 등은 서버 정렬로 위임 (문자열 비교)
      if (typeof s.propertyId === 'number') {
        // 타입별로 서버에서 처리할 수 있도록 키만 전달, 서버는 propId 기준 문자열 비교
        return { sortField: 'prop', sortDir: s.order, propId: s.propertyId };
      }
      return {};
    } catch (e) {
      return {};
    }
  }, [user?.id, documentId]);

  // 정렬 파라미터를 쿼리 키에 포함하기 위한 계산
  const sortParams = getServerSortParams();
  const sortKey = useMemo(() => {
    return JSON.stringify(sortParams);
  }, [sortParams]);

  // 1. 속성 조회 (React Query)
  const {
    data: propertiesData,
    isLoading: propertiesLoading,
    error: propertiesError,
    refetch: refetchProperties,
  } = useQuery<DocumentProperty[]>({
    queryKey: ['table-properties', workspaceId, documentId],
    queryFn: () => getProperties(workspaceId, documentId),
    enabled: !!workspaceId && !!documentId,
    staleTime: 1000
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (propertiesError) {
      log.error('속성 조회 실패', propertiesError);
      handleError(propertiesError, {
        customMessage: '속성 목록을 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [propertiesError, handleError]);

  const properties = propertiesData || [];

  // 2. 자식 문서 조회 (React Query useInfiniteQuery)
  const {
    data: rowsData,
    isLoading: rowsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: rowsError,
    refetch: refetchRows,
  } = useInfiniteQuery<InfiniteQueryPage>({
    queryKey: ['table-rows', workspaceId, documentId, sortKey],
    queryFn: async ({ pageParam = 0 }) => {
      const { sortField, sortDir, propId } = getServerSortParams();
      const response = await getChildDocumentsPaged(workspaceId, documentId, pageParam as number, 50, sortField, sortDir, propId);
      return {
        children: response?.content || [],
        page: response?.number || (pageParam as number),
        totalPages: response?.totalPages || 0,
        hasMore: (response?.number || 0) + 1 < (response?.totalPages || 0),
      };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 0,
    enabled: !!workspaceId && !!documentId,
    staleTime: 1000 
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (rowsError) {
      log.error('자식 문서 조회 실패', rowsError);
      handleError(rowsError, {
        customMessage: '문서 목록을 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [rowsError, handleError]);

  // 모든 페이지의 children을 하나의 배열로 합치기
  const allChildren = useMemo<Document[]>(() => {
    return rowsData?.pages.flatMap((page) => page.children) || [];
  }, [rowsData]);

  // 3. 속성 값 조회 (React Query) - 백엔드에서 빈 배열 처리
  const {
    data: propertyValuesData,
    isLoading: valuesLoading,
    error: valuesError,
  } = useQuery<DocumentPropertyValue[]>({
    queryKey: ['table-property-values', workspaceId, documentId],
    queryFn: () => getPropertyValuesByChildDocuments(workspaceId, documentId),
    enabled: !!workspaceId && !!documentId, // 백엔드에서 빈 케이스 처리
    staleTime: 1000 * 60 * 1, // 1분 - 속성 값은 자주 변경됨
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (valuesError) {
      log.error('속성 값 조회 실패', valuesError);
      handleError(valuesError, {
        customMessage: '속성 값을 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [valuesError, handleError]);

  // 속성 값을 documentId별로 그룹화
  const valuesByRowId = useMemo<Record<number, Record<number, PropertyValue>>>(() => {
    if (!propertyValuesData) return {};
    return propertyValuesData.reduce<Record<number, Record<number, PropertyValue>>>((acc, val) => {
      if (!acc[val.documentId]) acc[val.documentId] = {};
      acc[val.documentId][val.propertyId] = val.value;
      return acc;
    }, {});
  }, [propertyValuesData]);

  // 최종 rows 생성: children과 propertyValues를 합치기
  const rows = useMemo<TableRowData[]>(() => {
    return allChildren.map((child) => ({
      id: child.id,
      title: child.title,
      values: valuesByRowId[child.id] || {},
      document: child,
    }));
  }, [allChildren, valuesByRowId]);

  // 로딩 상태 통합
  const isLoading = propertiesLoading || rowsLoading || valuesLoading;
  const isFetchingMore = isFetchingNextPage;
  const hasMore = hasNextPage ?? false;
  const error = propertiesError || rowsError || valuesError;

  // fetchTableData는 기존 API와 호환성을 위해 유지 (모든 쿼리 refetch)
  const fetchTableData = useCallback(async () => {
    await Promise.all([
      refetchProperties(),
      refetchRows(),
    ]);
  }, [refetchProperties, refetchRows]);

  const handleAddProperty = useCallback(async (name: string, type: string) => {
    if (!name || !type) return;
    try {
      const newProperty = await addProperty(workspaceId, documentId, { name, type, sortOrder: properties.length });
      
      // React Query 캐시에 새 속성 추가
      queryClient.setQueryData<DocumentProperty[]>(['table-properties', workspaceId, documentId], (oldData) => {
        if (!oldData) return [newProperty];
        return [...oldData, newProperty];
      });
      
      if (rows.length > 0) {
        if (stableSystemMap[type]) {
          await Promise.all(
            rows.map(async (row) => {
              const value = stableSystemMap[type](row as { document: Document });
              await addOrUpdatePropertyValue(workspaceId, row.id, newProperty.id, value);
            })
          );
        } else {
          await Promise.all(rows.map((row) => addOrUpdatePropertyValue(workspaceId, row.id, newProperty.id, '')));
        }
        
        // 속성 값 캐시 무효화하여 자동 리페칭
        queryClient.invalidateQueries({ queryKey: ['table-property-values', workspaceId, documentId] });
      }
    } catch (e) {
      log.error('handleAddProperty 에러', e);
      handleError(e, {
        customMessage: '속성 추가에 실패했습니다.',
        showToast: true
      });
    }
  }, [workspaceId, documentId, properties.length, rows, stableSystemMap, handleError, queryClient]);

  const handleDeleteProperty = useCallback(async (propertyId: number) => {
    if (!window.confirm('정말로 이 속성을 삭제하시겠습니까?')) return;
    try {
      await deleteProperty(workspaceId, propertyId);
      
      // React Query 캐시에서 속성 제거
      queryClient.setQueryData<DocumentProperty[]>(['table-properties', workspaceId, documentId], (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter((p) => p.id !== propertyId);
      });
      
      // 속성 값 캐시 무효화 (삭제된 속성 값도 제거됨)
      queryClient.invalidateQueries({ queryKey: ['table-property-values', workspaceId, documentId] });
    } catch (e) {
      log.error('handleDeleteProperty 에러', e);
      handleError(e, {
        customMessage: '속성 삭제에 실패했습니다.',
        showToast: true
      });
    }
  }, [workspaceId, documentId, queryClient, handleError]);

  const handleAddRow = useCallback(async (position: 'top' | 'bottom' = 'bottom') => {
    try {
      // 실제 문서 생성
      const newDoc = await createDocument({
        title: '',
        content: '',
        parentId: documentId,
        viewType: 'PAGE',
      }, { silent: true }); // DocumentList 깜빡임 방지를 위해 silent 옵션 사용

      // 시스템/일반 속성 초기 값 DB 반영
      const ops = properties.map((p) => {
        let value = '';
        if (stableSystemMap[p.type]) {
          value = stableSystemMap[p.type]({ document: newDoc });
        }
        return addOrUpdatePropertyValue(workspaceId, newDoc.id, p.id, value);
      });

      if (ops.length > 0) {
        await Promise.all(ops);
      }

      // DB에 새로운 순서 반영
      try {
        // 현재 rows에 새 문서 추가하여 순서 계산
        const currentRowIds = rows.map(r => r.id);
        const newRowIds = position === 'top' 
          ? [newDoc.id, ...currentRowIds]
          : [...currentRowIds, newDoc.id];
        await updateChildDocumentOrder(workspaceId, documentId, newRowIds);
      } catch (error) {
        log.error('문서 순서 업데이트 실패', error);
        // 순서 업데이트 실패 시 사용자에게 알리지만 문서 생성은 성공한 상태
        handleError(error, {
          customMessage: '문서는 생성되었지만 순서 업데이트에 실패했습니다.',
          showToast: true
        });
      }
      
      // React Query 캐시 무효화하여 자동 리페칭
      queryClient.invalidateQueries({ queryKey: ['table-rows', workspaceId, documentId] });
      queryClient.invalidateQueries({ queryKey: ['table-property-values', workspaceId, documentId] });
    } catch (e) {
      log.error('handleAddRow 에러', e);
      handleError(e, {
        customMessage: '페이지 생성에 실패했습니다.',
        showToast: true
      });
    }
  }, [workspaceId, documentId, properties, rows, stableSystemMap, createDocument, updateChildDocumentOrder, queryClient, handleError]);

  // 상단에 추가하는 전용 함수
  const handleAddRowTop = () => handleAddRow('top');
  
  // 하단에 추가하는 전용 함수 (기본값)
  const handleAddRowBottom = () => handleAddRow('bottom');

  const handleCellValueChange = useCallback(async (rowId: number, propertyId: number | null, value: PropertyValue) => {
    if (propertyId == null) {
      // 제목 변경 - 낙관적 업데이트를 위해 캐시 직접 업데이트
      queryClient.setQueryData<{ pages: InfiniteQueryPage[] }>(['table-rows', workspaceId, documentId, sortKey], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            children: page.children.map((child) =>
              child.id === rowId ? { ...child, title: String(value) } : child
            ),
          })),
        };
      });
      
      try {
        const updated = await updateDocument(rowId, { title: String(value) });
        // 제목 변경 후 row.document 메타도 최신화
        queryClient.setQueryData<{ pages: InfiniteQueryPage[] }>(['table-rows', workspaceId, documentId, sortKey], (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              children: page.children.map((child) =>
                child.id === rowId ? { ...child, ...updated } : child
              ),
            })),
          };
        });
      } catch (e) {
        log.error('handleCellValueChange (title) 에러', e);
        handleError(e, {
          customMessage: '이름 저장에 실패했습니다.',
          showToast: true
        });
        // 에러 시 캐시 무효화하여 원래 상태로 복구
        queryClient.invalidateQueries({ queryKey: ['table-rows', workspaceId, documentId] });
      }
    } else {
      // 속성 값 변경 - 낙관적 업데이트
      queryClient.setQueryData<DocumentPropertyValue[]>(['table-property-values', workspaceId, documentId], (oldData) => {
        if (!oldData) return oldData;
        const existing = oldData.find((v) => v.documentId === rowId && v.propertyId === propertyId);
        if (existing) {
          return oldData.map((v) =>
            v.documentId === rowId && v.propertyId === propertyId
              ? { ...v, value }
              : v
          );
        } else {
          return [...oldData, { id: 0, documentId: rowId, propertyId, value }];
        }
      });
      
      try {
        const resp = await addOrUpdatePropertyValue(workspaceId, rowId, propertyId, value);
        // 서버 응답으로 캐시 업데이트
        queryClient.setQueryData<DocumentPropertyValue[]>(['table-property-values', workspaceId, documentId], (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((v) =>
            v.documentId === rowId && v.propertyId === propertyId
              ? { ...v, value, updatedAt: resp?.updatedAt, updatedBy: resp?.updatedBy }
              : v
          );
        });
        
        // rows의 document 메타도 업데이트
        queryClient.setQueryData<{ pages: InfiniteQueryPage[] }>(['table-rows', workspaceId, documentId, sortKey], (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              children: page.children.map((child) =>
                child.id === rowId
                  ? { 
                      ...child, 
                      updatedAt: resp?.updatedAt || child.updatedAt, 
                      updatedBy: resp?.updatedBy !== undefined ? String(resp.updatedBy) : child.updatedBy 
                    }
                  : child
              ),
            })),
          };
        });
      } catch (e) {
        log.error('handleCellValueChange (property) 에러', e);
        handleError(e, {
          customMessage: '값 저장에 실패했습니다.',
          showToast: true
        });
        // 에러 시 캐시 무효화하여 원래 상태로 복구
        queryClient.invalidateQueries({ queryKey: ['table-property-values', workspaceId, documentId] });
      }
    }
  }, [workspaceId, documentId, sortKey, queryClient, updateDocument, handleError]);

  const handleHeaderNameChange = useCallback(async () => {
    if (!editingHeader.id || !editingHeader.name) {
      setEditingHeader({ id: null, name: '' });
      return;
    }
    try {
      await updateProperty(workspaceId, editingHeader.id, editingHeader.name);
      
      // React Query 캐시 업데이트
      queryClient.setQueryData<DocumentProperty[]>(['table-properties', workspaceId, documentId], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((p) => (p.id === editingHeader.id ? { ...p, name: editingHeader.name } : p));
      });
    } catch (e) {
      log.error('handleHeaderNameChange 에러', e);
      handleError(e, {
        customMessage: '속성 이름 변경에 실패했습니다.',
        showToast: true
      });
    } finally {
      setEditingHeader({ id: null, name: '' });
    }
  }, [workspaceId, documentId, editingHeader, queryClient, handleError]);

  // setProperties는 기존 API와 호환성을 위해 제공 (React Query 캐시 업데이트)
  const setProperties = useCallback((updater: DocumentProperty[] | ((prev: DocumentProperty[]) => DocumentProperty[])) => {
    queryClient.setQueryData<DocumentProperty[]>(['table-properties', workspaceId, documentId], (oldData) => {
      if (!oldData) return oldData;
      if (typeof updater === 'function') {
        return updater(oldData);
      }
      return updater;
    });
  }, [workspaceId, documentId, queryClient]);

  // setRows는 기존 API와 호환성을 위해 제공 (React Query 캐시 업데이트)
  const setRows = useCallback((updater: Document[] | ((prev: Document[]) => Document[])) => {
    queryClient.setQueryData<{ pages: InfiniteQueryPage[] }>(['table-rows', workspaceId, documentId, sortKey], (oldData) => {
      if (!oldData) return oldData;
      if (typeof updater === 'function') {
        // 함수인 경우: 기존 pages 구조를 rows 배열로 변환하여 처리
        const currentRows = oldData.pages.flatMap((page) => page.children);
        const newRows = updater(currentRows);
        // rows를 다시 pages 구조로 변환 (첫 페이지에만 포함)
        return {
          ...oldData,
          pages: [{ ...oldData.pages[0], children: newRows }],
        };
      }
      // 배열인 경우
      return {
        ...oldData,
        pages: [{ ...oldData.pages[0], children: updater }],
      };
    });
  }, [workspaceId, documentId, sortKey, queryClient]);

  return {
    properties,
    setProperties,
    rows,
    setRows,
    isLoading,
    isFetchingMore,
    hasMore,
    fetchNextPage,
    error: error?.message || null,
    editingHeader,
    setEditingHeader,
    fetchTableData,
    handleAddProperty,
    handleDeleteProperty,
    handleAddRow,
    handleAddRowTop,
    handleAddRowBottom,
    handleCellValueChange,
    handleHeaderNameChange,
    currentDocument,
  };
}

