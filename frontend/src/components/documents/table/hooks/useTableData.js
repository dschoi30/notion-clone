import { useEffect, useState, useMemo } from 'react';
import {
  getProperties,
  addProperty,
  updateProperty,
  deleteProperty,
  addOrUpdatePropertyValue,
  getPropertyValuesByChildDocuments,
  getChildDocuments,
  updateChildDocumentOrder,
} from '@/services/documentApi';
import { useDocument } from '@/contexts/DocumentContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export function useTableData({ workspaceId, documentId, systemPropTypeMap }) {
  const [properties, setProperties] = useState([]);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingHeader, setEditingHeader] = useState({ id: null, name: '' });
  const { createDocument, updateDocument, fetchDocument } = useDocument();
  const { handleError } = useErrorHandler();

  // 시스템 속성 맵은 참조 안정화를 위해 캡처
  const stableSystemMap = useMemo(() => systemPropTypeMap || {}, [systemPropTypeMap]);

  async function fetchTableData() {
    setIsLoading(true);
    setError(null);
    try {
      const props = await getProperties(workspaceId, documentId);
      setProperties(props);
      const children = await getChildDocuments(workspaceId, documentId);
      setRows([]);
      if (!children || children.length === 0) {
        setProperties([]);
        setRows([]);
        return;
      }
      const allValues = await getPropertyValuesByChildDocuments(workspaceId, documentId);
      const valuesByRowId = allValues.reduce((acc, val) => {
        if (!acc[val.documentId]) acc[val.documentId] = {};
        acc[val.documentId][val.propertyId] = val.value;
        return acc;
      }, {});
      const tableRows = children.map((child) => ({
        id: child.id,
        title: child.title,
        values: valuesByRowId[child.id] || {},
        document: child,
      }));
      setRows(tableRows);
    } catch (err) {
      setError(err);
      console.error('테이블 데이터 로딩 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!workspaceId || !documentId) return;
    fetchTableData();
  }, [workspaceId, documentId]);

  const handleAddProperty = async (name, type) => {
    if (!name || !type) return;
    try {
      const newProperty = await addProperty(workspaceId, documentId, { name, type, sortOrder: properties.length });
      setProperties((prev) => [...prev, newProperty]);
      if (rows.length > 0) {
        if (stableSystemMap[type]) {
          await Promise.all(
            rows.map(async (row) => {
              const value = stableSystemMap[type](row);
              await addOrUpdatePropertyValue(workspaceId, row.id, newProperty.id, value);
              row.values[newProperty.id] = value;
            })
          );
          setRows([...rows]);
        } else {
          await Promise.all(rows.map((row) => addOrUpdatePropertyValue(workspaceId, row.id, newProperty.id, '')));
        }
      }
    } catch (e) {
      handleError(e, {
        customMessage: '속성 추가에 실패했습니다.',
        showToast: true
      });
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    if (!window.confirm('정말로 이 속성을 삭제하시겠습니까?')) return;
    try {
      await deleteProperty(workspaceId, propertyId);
      setProperties((prev) => prev.filter((p) => p.id !== propertyId));
      setRows((prev) =>
        prev.map((row) => {
          const newValues = { ...row.values };
          delete newValues[propertyId];
          return { ...row, values: newValues };
        })
      );
    } catch (e) {
      handleError(e, {
        customMessage: '속성 삭제에 실패했습니다.',
        showToast: true
      });
    }
  };

  const handleAddRow = async (position = 'bottom') => {
    try {
      // 임시 ID로 로컬 상태 먼저 업데이트 (즉시 반영)
      const tempId = `temp_${Date.now()}`;
      const tempRow = { 
        id: tempId, 
        title: '', 
        values: {}, 
        document: { 
          id: tempId, 
          title: '', 
          viewType: 'PAGE',
          parentId: documentId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } 
      };

      // 시스템/일반 속성 초기 값 설정
      properties.forEach((p) => {
        let value = '';
        if (stableSystemMap[p.type]) {
          value = stableSystemMap[p.type]({ document: tempRow.document });
        }
        tempRow.values[p.id] = value;
      });

      // position에 따라 즉시 UI에 반영
      let newRows;
      if (position === 'top') {
        newRows = [tempRow, ...rows];
        setRows(newRows);
      } else {
        newRows = [...rows, tempRow];
        setRows(newRows);
      }

      // 실제 문서 생성
      const newDoc = await createDocument({
        title: '',
        content: '',
        parentId: documentId,
        viewType: 'PAGE',
      }, { silent: true }); // DocumentList 깜빡임 방지를 위해 silent 옵션 사용

      // 임시 행을 실제 문서로 교체
      const finalRow = { 
        id: newDoc.id, 
        title: '', 
        values: {}, 
        document: newDoc 
      };

      // 시스템/일반 속성 초기 값 DB 반영
      const ops = properties.map((p) => {
        let value = '';
        if (stableSystemMap[p.type]) {
          value = stableSystemMap[p.type]({ document: newDoc });
        }
        finalRow.values[p.id] = value;
        return addOrUpdatePropertyValue(workspaceId, newDoc.id, p.id, value);
      });

      if (ops.length > 0) {
        await Promise.all(ops);
      }

      // 임시 행을 실제 행으로 교체
      const finalRows = newRows.map(row => row.id === tempId ? finalRow : row);
      setRows(finalRows);

      // DB에 새로운 순서 반영
      try {
        const orderedIds = finalRows.map(row => row.id);
        await updateChildDocumentOrder(workspaceId, documentId, orderedIds);
      } catch (error) {
        console.error('문서 순서 업데이트 실패:', error);
        // 순서 업데이트 실패 시 사용자에게 알리지만 문서 생성은 성공한 상태
        handleError(error, {
          customMessage: '문서는 생성되었지만 순서 업데이트에 실패했습니다.',
          showToast: true
        });
      }
    } catch (e) {
      // 실패 시 임시 행 제거
      setRows(prev => prev.filter(row => !row.id.startsWith('temp_')));
      handleError(e, {
        customMessage: '페이지 생성에 실패했습니다.',
        showToast: true
      });
    }
  };

  // 상단에 추가하는 전용 함수
  const handleAddRowTop = () => handleAddRow('top');
  
  // 하단에 추가하는 전용 함수 (기본값)
  const handleAddRowBottom = () => handleAddRow('bottom');

  const handleCellValueChange = async (rowId, propertyId, value) => {
    if (propertyId == null) {
      setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, title: value } : row)));
      try {
        const updated = await updateDocument(rowId, { title: value });
        // 제목 변경 후 row.document 메타도 최신화
        setRows((prev) => prev.map((row) => (
          row.id === rowId 
          ? { ...row, document: { ...row.document, ...updated } } 
          : row
        )));
      } catch (e) {
        handleError(e, {
          customMessage: '이름 저장에 실패했습니다.',
          showToast: true
        });
      }
    } else {
      setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, values: { ...row.values, [propertyId]: value } } : row)));
      try {
        // 낙관적: 즉시 화면에 최신 시간 반영
        setRows((prev) => prev.map((row) => (
          row.id === rowId
            ? { ...row, document: { ...row.document, updatedAt: new Date().toISOString() } }
            : row
        )));
        const resp = await addOrUpdatePropertyValue(workspaceId, rowId, propertyId, value);
        // 서버가 알려준 최신 메타(updatedAt/updatedBy)로 해당 행 문서 메타 갱신
        setRows((prev) => prev.map((row) => (
          row.id === rowId
            ? { ...row, document: { ...row.document, updatedAt: resp?.updatedAt || row.document?.updatedAt, updatedBy: resp?.updatedBy || row.document?.updatedBy } }
            : row
        )));
      } catch (e) {
        handleError(e, {
          customMessage: '값 저장에 실패했습니다.',
          showToast: true
        });
      }
    }
  };

  const handleHeaderNameChange = async () => {
    if (!editingHeader.id || !editingHeader.name) {
      setEditingHeader({ id: null, name: '' });
      return;
    }
    try {
      await updateProperty(workspaceId, editingHeader.id, editingHeader.name);
      setProperties((prev) => prev.map((p) => (p.id === editingHeader.id ? { ...p, name: editingHeader.name } : p)));
    } catch (e) {
      handleError(e, {
        customMessage: '속성 이름 변경에 실패했습니다.',
        showToast: true
      });
    } finally {
      setEditingHeader({ id: null, name: '' });
    }
  };

  return {
    properties,
    setProperties,
    rows,
    setRows,
    isLoading,
    error,
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
  };
}

