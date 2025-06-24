import React, { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Text, Hash, Calendar, Tag as TagIcon, User, Clock, Edit3 } from 'lucide-react';
import { addProperty, deleteProperty, addOrUpdatePropertyValue, updateDocument, createDocument, updateProperty, updateTitleColumnWidth, updatePropertyWidth } from '../../services/documentApi';
import AddPropertyPopover from './AddPropertyPopover';

function getPropertyIcon(type) {
  switch (type) {
    case 'text': return <Text className="inline mr-1" size={16} />;
    case 'number': return <Hash className="inline mr-1" size={16} />;
    case 'date': return <Calendar className="inline mr-1" size={16} />;
    case 'tag': return <TagIcon className="inline mr-1" size={16} />;
    case 'CREATED_BY': return <User className="inline mr-1" size={16} />;
    case 'LAST_EDITED_BY': return <Edit3 className="inline mr-1" size={16} />;
    case 'CREATED_TIME': return <Clock className="inline mr-1" size={16} />;
    case 'LAST_EDITED_TIME': return <Clock className="inline mr-1" size={16} />;
    default: return null;
  }
}

export default function DocumentTableView({ workspaceId, documentId, properties, setProperties, rows, setRows, titleColumnWidth, propertyWidths }) {
  const [editingCell, setEditingCell] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [editingHeader, setEditingHeader] = useState({ id: null, name: '' });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const addBtnRef = useRef(null);
  const defaultWidth = 192; // 12rem
  const [colWidths, setColWidths] = useState(() => [titleColumnWidth || 288, ...(propertyWidths && propertyWidths.length ? propertyWidths : properties.map(() => defaultWidth))]);
  const liveWidths = useRef(colWidths);

  React.useEffect(() => {
    console.log('propertyWidths', propertyWidths);
    const initial = [titleColumnWidth || 288, ...(propertyWidths && propertyWidths.length ? propertyWidths : properties.map(() => defaultWidth))];
    setColWidths(initial);
    liveWidths.current = initial;
    // eslint-disable-next-line
  }, [titleColumnWidth, propertyWidths && propertyWidths.join(','), properties.length]);

  const resizingCol = useRef(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleResizeMouseDown = (e, colIdx) => {
    resizingCol.current = colIdx;
    startX.current = e.clientX;
    startWidth.current = colWidths[colIdx];
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', handleResizeMouseMove);
    window.addEventListener('mouseup', handleResizeMouseUp);
  };
  const handleResizeMouseMove = (e) => {
    if (resizingCol.current == null) return;
    const dx = e.clientX - startX.current;
    const newWidth = Math.max(80, startWidth.current + dx);
    setColWidths((prev) => {
      const next = [...prev];
      next[resizingCol.current] = newWidth;
      return next;
    });
    liveWidths.current[resizingCol.current] = newWidth;
  };
  const handleResizeMouseUp = async () => {
    // 서버에 PATCH
    if (resizingCol.current != null) {
      const colIdx = resizingCol.current;
      const width = liveWidths.current[colIdx]; // 항상 최신값
      console.log(colIdx, 'width', width);
      try {
        if (colIdx === 0) {
          // title 컬럼
          await updateTitleColumnWidth(workspaceId, documentId, width);
        } else {
          // property 컬럼
          const property = properties[colIdx - 1];
          if (property) {
            await updatePropertyWidth(workspaceId, property.id, width);
          }
        }
      } catch (e) {
        // 실패해도 UI는 반영
      }
    }
    resizingCol.current = null;
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', handleResizeMouseMove);
    window.removeEventListener('mouseup', handleResizeMouseUp);
  };

  const handleAddProperty = async (name, type) => {
    if (!name || !type) return;
    try {
      const newProperty = await addProperty(workspaceId, documentId, { name, type, sortOrder: properties.length });
      setProperties(prev => [...prev, newProperty]);
      if (rows.length > 0) {
        await Promise.all(rows.map(row => addOrUpdatePropertyValue(workspaceId, row.id, newProperty.id, '')));
      }
      setIsPopoverOpen(false);
    } catch (e) {
      alert('속성 추가 실패');
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    if (!window.confirm('정말로 이 속성을 삭제하시겠습니까?')) return;
    try {
      await deleteProperty(workspaceId, propertyId);
      setProperties(prev => prev.filter(p => p.id !== propertyId));
      setRows(prev => prev.map(row => {
        const newValues = { ...row.values };
        delete newValues[propertyId];
        return { ...row, values: newValues };
      }));
    } catch (e) {
      alert('속성 삭제 실패');
    }
  };

  const handleAddRow = async () => {
    try {
      const newDoc = await createDocument(workspaceId, {
        title: '',
        content: '',
        parentId: documentId,
        viewType: 'PAGE',
      });
      const newRow = { id: newDoc.id, title: '', values: {} };
      properties.forEach(p => { newRow.values[p.id] = ''; });
      setRows(prev => [...prev, newRow]);
    } catch (e) {
      alert('페이지 생성 실패');
    }
  };

  const handleCellValueChange = async (rowId, propertyId, value) => {
    if (propertyId == null) {
      // 이름 셀(타이틀) 변경
      setRows(prev => prev.map(row => row.id === rowId ? { ...row, title: value } : row));
      // 자식 document의 title을 백엔드에 PATCH
      try {
        await updateDocument(workspaceId, rowId, { title: value });
      } catch (e) {
        alert('이름 저장 실패');
      }
    } else {
      setRows(prev => prev.map(row =>
        row.id === rowId ? { ...row, values: { ...row.values, [propertyId]: value } } : row
      ));
      if (propertyId) {
        try {
          await addOrUpdatePropertyValue(workspaceId, rowId, propertyId, value);
        } catch (e) {
          alert('값 저장 실패');
        }
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
      setProperties(prev => prev.map(p => p.id === editingHeader.id ? { ...p, name: editingHeader.name } : p));
    } catch (e) {
      alert('속성 이름 변경 실패');
    } finally {
      setEditingHeader({ id: null, name: '' });
    }
  };

  const renderCell = (row, property, idx, isNameCell = false, rowIdx = 0) => {
    const rowId = row.id;
    const propertyId = isNameCell ? null : property.id;
    const isEditing = editingCell && editingCell.rowId === rowId && editingCell.propertyId === propertyId;
    const isHovered = hoveredCell && hoveredCell.rowId === rowId && hoveredCell.propertyId === propertyId;
    const value = isNameCell ? row.title : row.values[property.id] || '';
    const borderTop = rowIdx === 0 ? '1px solid #e9e9e7' : 'none';
    const colIdx = isNameCell ? 0 : 1 + idx;
    return (
      <div
        key={isNameCell ? 'name' : property.id}
        className="notion-table-view-cell"
        style={{
          display: 'flex',
          width: colWidths[colIdx],
          minWidth: 80,
          minHeight: '36px',
          alignItems: 'center',
          fontSize: '14px',
          padding: '8px',
          borderTop: borderTop,
          borderBottom: '1px solid #e9e9e7',
          borderRight: '1px solid #e9e9e7',
          borderLeft: 'none',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          background: isEditing
            ? '#e9e9e7'
            : isHovered
            ? '#f5f5f5'
            : 'transparent',
          cursor: isEditing ? 'text' : 'pointer',
          position: 'relative',
        }}
        onClick={() => setEditingCell({ rowId, propertyId })}
        onMouseEnter={() => setHoveredCell({ rowId, propertyId })}
        onMouseLeave={() => setHoveredCell(null)}
      >
        {isEditing ? (
          <input
            autoFocus
            className="w-full px-2 py-1 border rounded outline-none"
            style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
            value={value}
            onChange={e => handleCellValueChange(rowId, propertyId, e.target.value)}
            onBlur={() => setEditingCell(null)}
            onKeyDown={e => {
              if (e.key === 'Enter') setEditingCell(null);
            }}
          />
        ) : (
          <span style={{ width: '100%', minHeight: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{value}</span>
        )}
      </div>
    );
  };

  return (
    <div className="relative overflow-x-visible bg-white">
      <div style={{ minWidth: 'max-content' }}>
        <div className="flex items-center px-4">
          {/* 이름 컬럼 */}
          <div className="relative flex items-center font-semibold" style={{ minWidth: colWidths[0], width: colWidths[0], padding: '8px', borderLeft: 'none', borderRight: properties.length === 0 ? 'none' : '1px solid #e9e9e7' }}>
            <Text className="inline mr-1" size={16} />이름
            <div
              style={{ position: 'absolute', right: 0, top: 0, width: 6, height: '100%', cursor: 'col-resize', zIndex: 10 }}
              onMouseDown={e => handleResizeMouseDown(e, 0)}
            />
          </div>
          {/* property 컬럼 */}
          {properties.map((p, idx) => (
            <div
              key={p.id}
              className="relative flex items-center font-semibold group"
              style={{
                minWidth: colWidths[1 + idx],
                width: colWidths[1 + idx],
                padding: '8px',
                borderRight: '1px solid #e9e9e7',
                borderLeft: 'none',
                position: 'relative',
              }}
            >
              {editingHeader.id === p.id ? (
                <input
                  value={editingHeader.name}
                  onChange={e => setEditingHeader(prev => ({...prev, name: e.target.value}))}
                  onBlur={handleHeaderNameChange}
                  onKeyDown={e => e.key === 'Enter' && handleHeaderNameChange()}
                  autoFocus
                  className="w-full px-1 py-0 text-sm bg-gray-200 border border-blue-400 rounded outline-none"
                />
              ) : (
                <div
                  className="flex items-center w-full"
                  onClick={() => setEditingHeader({ id: p.id, name: p.name })}
                >
                  {getPropertyIcon(p.type)}{p.name}
                </div>
              )}
              <button
                className="ml-2 text-gray-400 transition opacity-0 hover:text-red-500 group-hover:opacity-100"
                style={{ fontSize: 14 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProperty(p.id);
                }}
                title="컬럼 삭제"
              >
                ×
              </button>
              <div
                style={{ position: 'absolute', right: 0, top: 0, width: 6, height: '100%', cursor: 'col-resize', zIndex: 10 }}
                onMouseDown={e => handleResizeMouseDown(e, 1 + idx)}
              />
            </div>
          ))}
          <div className="relative">
            <Button ref={addBtnRef} size="sm" variant="ghost" className="ml-2" onClick={() => setIsPopoverOpen(prev => !prev)}>
              + 속성 추가
            </Button>
            {isPopoverOpen && (
              <div className="absolute left-0 z-10 mt-1 top-full" >
                <AddPropertyPopover 
                  onAddProperty={handleAddProperty} 
                />
              </div>
            )}
          </div>
        </div>
        <div className="px-4">
          {rows.length === 0 ? (
            <div className="flex items-center h-10 text-gray-400">빈 행</div>
          ) : (
            rows.map((row, rowIdx) => (
              <div key={row.id} className="flex items-center h-10">
                {/* 이름 셀 */}
                {renderCell(row, null, 0, true, rowIdx)}
                {/* property 셀 */}
                {properties.map((p, idx) => renderCell(row, p, idx, false, rowIdx))}
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-2">
          <Button size="sm" variant="ghost" onClick={handleAddRow}>+ 새 페이지</Button>
        </div>
      </div>
    </div>
  );
} 