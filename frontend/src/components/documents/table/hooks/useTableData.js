import { useEffect, useState } from 'react';
import {
  getProperties,
  addProperty,
  updateProperty,
  deleteProperty,
  addOrUpdatePropertyValue,
  getPropertyValuesByChildDocuments,
  getChildDocuments,
} from '@/services/documentApi';
import { useDocument } from '@/contexts/DocumentContext';

export function useTableData({ workspaceId, documentId, systemPropTypeMap }) {
  const [properties, setProperties] = useState([]);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingHeader, setEditingHeader] = useState({ id: null, name: '' });
  const { createDocument, updateDocument } = useDocument();

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
        if (systemPropTypeMap[type]) {
          await Promise.all(
            rows.map(async (row) => {
              const value = systemPropTypeMap[type](row);
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
      alert('속성 추가 실패');
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
      alert('속성 삭제 실패');
    }
  };

  const handleAddRow = async () => {
    try {
      const newDoc = await createDocument({
        title: '',
        content: '',
        parentId: documentId,
        viewType: 'PAGE',
      });
      const newRow = { id: newDoc.id, title: '', values: {} };

      // 시스템/일반 속성 모두 초기 값 DB 반영
      const ops = properties.map((p) => {
        let value = '';
        if (systemPropTypeMap[p.type]) {
          // systemPropType 값 계산 (newDoc 메타데이터 기반)
          value = systemPropTypeMap[p.type]({ document: newDoc });
        }
        newRow.values[p.id] = value;
        return addOrUpdatePropertyValue(workspaceId, newDoc.id, p.id, value);
      });

      if (ops.length > 0) {
        await Promise.all(ops);
      }

      setRows((prev) => [...prev, newRow]);
    } catch (e) {
      alert('페이지 생성 실패');
    }
  };

  const handleCellValueChange = async (rowId, propertyId, value) => {
    if (propertyId == null) {
      setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, title: value } : row)));
      try {
        await updateDocument(rowId, { title: value });
      } catch (e) {
        alert('이름 저장 실패');
      }
    } else {
      setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, values: { ...row.values, [propertyId]: value } } : row)));
      try {
        await addOrUpdatePropertyValue(workspaceId, rowId, propertyId, value);
      } catch (e) {
        alert('값 저장 실패');
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
      alert('속성 이름 변경 실패');
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
    handleCellValueChange,
    handleHeaderNameChange,
  };
}

