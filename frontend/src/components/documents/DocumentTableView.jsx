import React, { useState, useEffect, useRef, createRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Text, Hash, Calendar, Tag as TagIcon, User, Clock, Edit3 } from 'lucide-react';
import { useDocument } from '@/contexts/DocumentContext';
import { getProperties, addProperty, updateProperty, deleteProperty, addOrUpdatePropertyValue, updatePropertyWidth, getPropertyValuesByChildDocuments,
  updateDocument, createDocument, updateTitleColumnWidth, getChildDocuments } from '@/services/documentApi';
import { Button } from '@/components/ui/button';
import AddPropertyPopover from './AddPropertyPopover';
import DatePopover from './DatePopover';
import TagPopover from './TagPopover';
import { formatKoreanDateTime } from '@/lib/utils';
import { getColorObj } from '@/lib/colors';
import { useDocumentPropertiesStore } from '@/hooks/useDocumentPropertiesStore';
import { useWorkspace } from '@/contexts/WorkspaceContext';

function getPropertyIcon(type) {
  switch (type) {
    case 'TEXT': return <Text className="inline mr-1" size={16} />;
    case 'NUMBER': return <Hash className="inline mr-1" size={16} />;
    case 'DATE': return <Calendar className="inline mr-1" size={16} />;
    case 'TAG': return <TagIcon className="inline mr-1" size={16} />;
    case 'CREATED_BY': return <User className="inline mr-1" size={16} />;
    case 'LAST_UPDATED_BY': return <Edit3 className="inline mr-1" size={16} />;
    case 'CREATED_AT': return <Clock className="inline mr-1" size={16} />;
    case 'LAST_UPDATED_AT': return <Clock className="inline mr-1" size={16} />;
    default: return null;
  }
}

const DocumentTableView = ({ workspaceId, documentId, parentProps}) => {
  const [properties, setProperties] = useState(parentProps || []); // [{ id, name, type }]
  const [rows, setRows] = useState([]); // [{ id, title, values: { [propertyId]: value }, document }]
  const [editingCell, setEditingCell] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [editingHeader, setEditingHeader] = useState({ id: null, name: '' });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const addBtnRef = useRef(null);
  const tagCellRefs = useRef({}); // {rowId_propertyId: ref}
  const [tagPopoverRect, setTagPopoverRect] = useState(null);
  const defaultWidth = 192; // 12rem
  // zustand store에서 width 정보 가져오기
  const storeProperties = useDocumentPropertiesStore(state => state.properties);
  const storeDocumentId = useDocumentPropertiesStore(state => state.documentId);
  const titleColumnWidth = (() => {
    // properties가 아니라 document에서 가져와야 함. (storeDocumentId가 바뀔 때마다 갱신)
    // store에서 titleColumnWidth를 별도로 관리하지 않으므로, properties fetch 후 setProperties에서 받아온 document에서 추출 필요
    // 일단 properties에 없으므로, props로 받은 documentId가 바뀔 때마다 getDocument로 받아와야 함
    // 하지만 기존 구조상 properties만 zustand에 있으므로, 일단 288로 fallback
    // 추후 store에 titleColumnWidth 추가 필요
    return 288;
  })();
  const propertyWidths = storeProperties.map(p => p.width ?? defaultWidth);
  const [colWidths, setColWidths] = useState(() => [titleColumnWidth, ...propertyWidths]);
  const liveWidths = useRef(colWidths);

  useEffect(() => {
    const initial = [titleColumnWidth, ...propertyWidths];
    setColWidths(initial);
    liveWidths.current = initial;
    // eslint-disable-next-line
  }, [titleColumnWidth, propertyWidths.join(","), storeProperties.length]);

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
    const newWidth = Math.max(100, startWidth.current + dx);
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

  const systemPropTypeMap = {
    CREATED_BY: row => row.document?.createdBy || '',
    LAST_UPDATED_BY: row => row.document?.updatedBy || '',
    CREATED_AT: row => row.document?.createdAt || '',
    LAST_UPDATED_AT: row => row.document?.updatedAt || '',
  };

  const handleAddProperty = async (name, type) => {
    if (!name || !type) return;
    try {
      const newProperty = await addProperty(workspaceId, documentId, { name, type, sortOrder: properties.length });
      setProperties(prev => [...prev, newProperty]);
      if (rows.length > 0) {
        // systemPropTypes면 자동 값 입력
        if (systemPropTypeMap[type]) {
          await Promise.all(rows.map(async row => {
            const value = systemPropTypeMap[type](row);
            await addOrUpdatePropertyValue(workspaceId, row.id, newProperty.id, value);
            // 프론트에도 즉시 반영
            row.values[newProperty.id] = value;
          }));
          setRows([...rows]);
        } else {
          await Promise.all(rows.map(row => addOrUpdatePropertyValue(workspaceId, row.id, newProperty.id, '')));
        }
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
      properties.forEach(p => {
        if (systemPropTypeMap[p.type]) {
          switch (p.type) {
            case 'CREATED_BY':
              newRow.values[p.id] = newDoc.createdBy;
              break;
            case 'LAST_UPDATED_BY':
              newRow.values[p.id] = newDoc.updatedBy;
              break;
            case 'CREATED_AT':
              newRow.values[p.id] = newDoc.createdAt;
              break;
            case 'LAST_UPDATED_AT':
              newRow.values[p.id] = newDoc.updatedAt;
              break;
          }
        } else {
          newRow.values[p.id] = '';
        }
      });
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
          setProperties(prev => prev.map(p => p.id === editingHeader.id ? { ...p, name: editingHeader.name } : p));
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

  const SYSTEM_PROP_TYPES = ['CREATED_BY', 'LAST_UPDATED_BY', 'CREATED_AT', 'LAST_UPDATED_AT'];

  const cellRefs = useRef({}); // {rowId_propertyId: ref}

  const { currentDocument, selectDocument } = useDocument();
  const { currentWorkspace } = useWorkspace();
  const fetchProperties = useDocumentPropertiesStore(state => state.fetchProperties);
  const setDocumentId = useDocumentPropertiesStore(state => state.setDocumentId);

  useEffect(() => {
    if (currentWorkspace && currentDocument) {
      fetchProperties(currentWorkspace.id, currentDocument.id);
      setDocumentId(currentDocument.id);
    }
  }, [currentWorkspace, currentDocument, fetchProperties, setDocumentId]);

  async function fetchTableData() {
    // 1. 컬럼 정보 조회
    const props = await getProperties(workspaceId, documentId);
    setProperties(props);
    // 2. 자식 문서(PAGE) 목록 fetch
    const children = await getChildDocuments(workspaceId, documentId);
    setRows([]); // 초기화
    if (!children || children.length === 0) {
      setProperties([]);
      setRows([]);
      return;
    }
    // 3. 모든 자식(PAGE) 문서의 property value fetch
    const allValues = await getPropertyValuesByChildDocuments(workspaceId, documentId);
    // 4. 자식문서 ID를 key로 값들을 그룹핑
    const valuesByRowId = allValues.reduce((acc, val) => {
      if (!acc[val.documentId]) acc[val.documentId] = {};
      acc[val.documentId][val.propertyId] = val.value;
      return acc;
    }, {});
    // 5. 최종 테이블 데이터(행) 구성
    const tableRows = children.map(child => ({
      id: child.id,
      title: child.title,
      values: valuesByRowId[child.id] || {},
      document: child // document 전체 포함
    }));
    setRows(tableRows);
  }

  useEffect(() => {
    fetchTableData();
  }, [workspaceId, documentId]);

  const renderCell = (row, property, idx, isNameCell = false, rowIdx = 0) => {
    const rowId = row.id;
    const propertyId = isNameCell ? null : property?.id;
    const isEditing = editingCell && editingCell.rowId === rowId && editingCell.propertyId === propertyId;
    const isHovered = hoveredCell && hoveredCell.rowId === rowId && hoveredCell.propertyId === propertyId;
    let value = isNameCell ? row.title : (property ? row.values[property.id] || '' : '');
    let content = value;
    // 이름 셀(타이틀 셀) 처리
    if (isNameCell) {
      return (
        <div
          key={'name'}
          className="flex relative items-center h-full notion-table-view-cell"
          style={{
            width: colWidths[0],
            minWidth: 80,
            minHeight: '36px',
            fontSize: '14px',
            borderTop: rowIdx === 0 ? '1px solid #e9e9e7' : 'none',
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
          }}
          onClick={() => {
            setEditingCell({ rowId, propertyId: null });
          }}
          onMouseEnter={() => setHoveredCell({ rowId, propertyId: null })}
          onMouseLeave={() => setHoveredCell(null)}
        >
          {isEditing ? (
            <input
              autoFocus
              className="px-2 w-full h-full rounded border outline-none"
              style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
              value={value}
              onChange={e => handleCellValueChange(rowId, null, e.target.value)}
              onBlur={() => setEditingCell(null)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingCell(null); }}
            />
          ) : (
            <>
              <span className="px-2 text-gray-700" style={{ width: '100%', minHeight: 20, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',  whiteSpace: 'nowrap', fontWeight: 600 }}>{value}</span>
              {isHovered && (
                <button
                  type="button"
                  onClick={async e => {
                    e.stopPropagation();
                    await selectDocument({ id: rowId });
                    <Navigate to={`/document/${rowId}`} />;
                  }}
                  className="absolute right-2 top-1/2 px-2 py-1 text-xs rounded border border-gray-300 transition -translate-y-1/2 hover:bg-gray-200"
                  style={{ zIndex: 20 }}
                  title="문서 열기"
                >
                  열기
                </button>
              )}
            </>
          )}
        </div>
      );
    }
    // property가 null이 아니어야 아래 처리 진행
    if (!property) return null;
    // 날짜/시간 포맷 적용
    if (property.type === 'CREATED_AT' || property.type === 'LAST_UPDATED_AT') {
      content = formatKoreanDateTime(value);
    }
    // TAG 타입은 pill로 렌더링
    if (property.type === 'TAG') {
      let tags = [];
      try { tags = value ? JSON.parse(value) : []; } catch {}
      const tagOptions = property.tagOptions || [];
      const cellKey = `${rowId}_${property.id}`;
      content = (
        <div
          ref={el => { if (property.type === 'TAG'){
            tagCellRefs.current[cellKey] = el;
          }
        }}
          className="flex gap-1 items-center px-2"
          style={{ minWidth: 0, minHeight: 32, overflow: 'hidden', whiteSpace: 'nowrap', flexWrap: 'nowrap' }}
          onClick={e => {
            if (!SYSTEM_PROP_TYPES.includes(property.type)) {
              const rect = tagCellRefs.current[cellKey]?.getBoundingClientRect();
              if (rect && rect.width > 0 && rect.height > 0) {
                setTagPopoverRect({
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                });
                setEditingCell({ rowId, propertyId });
              }
            }
          }}
        >
          {tags.map(tagId => {
            const tagObj = tagOptions.find(opt => opt.id === tagId);
            if (!tagObj) return null;
            const colorObj = getColorObj(tagObj.color || 'default');
            return (
              <span
                key={tagObj.id}
                className={`inline-flex items-center px-2 py-0.5 rounded text-sm ${colorObj.bg} border ${colorObj.border}`}
                style={{
                  whiteSpace: 'nowrap',
                  maxWidth: 120,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'inline-table',
                  width: 'auto',
                  minWidth: 0
                }}
              >
                {tagObj.label}
              </span>
            );
          })}
        </div>
      );
    }
    const isSystemProp = SYSTEM_PROP_TYPES.includes(property.type);
    // ref 생성 및 저장
    const cellKey = `${rowId}_${propertyId}`;
    if (!cellRefs.current[cellKey]) cellRefs.current[cellKey] = createRef();
    return (
      <div
        key={isNameCell ? 'name' : property.id}
        ref={cellRefs.current[cellKey]}
        className="flex relative items-center h-full notion-table-view-cell"
        style={{
          width: colWidths[isNameCell ? 0 : 1 + idx],
          minWidth: 80,
          minHeight: '36px',
          fontSize: '14px',
          borderTop: rowIdx === 0 ? '1px solid #e9e9e7' : 'none',
          borderBottom: '1px solid #e9e9e7',
          borderRight: '1px solid #e9e9e7',
          borderLeft: 'none',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          background: (editingCell && editingCell.rowId === rowId && editingCell.propertyId === propertyId)
            ? '#e9e9e7'
            : (hoveredCell && hoveredCell.rowId === rowId && hoveredCell.propertyId === propertyId)
            ? '#f5f5f5'
            : 'transparent',
          cursor: (editingCell && editingCell.rowId === rowId && editingCell.propertyId === propertyId)
            ? (SYSTEM_PROP_TYPES.includes(property?.type) ? 'default' : 'text')
            : (SYSTEM_PROP_TYPES.includes(property?.type) ? 'default' : 'pointer'),
        }}
        onClick={() => {
          if (isNameCell) {
            setEditingCell({ rowId, propertyId: null });
          } else if (!SYSTEM_PROP_TYPES.includes(property.type)) {
            setEditingCell({ rowId, propertyId });
          }
        }}
        onMouseEnter={() => setHoveredCell({ rowId, propertyId })}
        onMouseLeave={() => setHoveredCell(null)}
      >
        {isEditing && !isSystemProp ? (
          property.type === 'TEXT' ? (
            <input
              autoFocus
              className="px-2 w-full h-full rounded border outline-none"
              style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
              value={value}
              onChange={e => handleCellValueChange(rowId, propertyId, e.target.value)}
              onBlur={() => setEditingCell(null)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingCell(null); }}
            />
          ) : property.type === 'NUMBER' ? (
            <input
              type="number"
              autoFocus
              className="px-2 py-1 w-full h-full rounded border outline-none"
              style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
              value={value}
              onChange={e => handleCellValueChange(rowId, propertyId, e.target.value)}
              onBlur={() => setEditingCell(null)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingCell(null); }}
            />
          ) : property.type === 'DATE' ? (
            <DatePopover
              value={value}
              onChange={val => handleCellValueChange(rowId, propertyId, val)}
              onClose={() => setEditingCell(null)}
            />
          ) : property.type === 'TAG' ? (
            <TagPopover
              propertyId={property.id}
              value={value}
              tagOptions={property.tagOptions}
              onChange={val => {
                handleCellValueChange(rowId, property.id, val);
              }}
              onTagOptionsUpdate={async (updatedTagOptions) => {
                setProperties(prev => prev.map(p => 
                  p.id === property.id ? { ...p, tagOptions: updatedTagOptions } : p
                ));
                
                // 모든 행에 해당 property의 빈 값 추가 (없는 경우에만)
                setRows(prev => prev.map(row => {
                  if (!(property.id in row.values)) {
                    return { ...row, values: { ...row.values, [property.id]: '' } };
                  }
                  return row;
                }));
              }}
              onClose={() => {
                handleCellValueChange(rowId, property.id, value);
                setEditingCell(null); 
                setTagPopoverRect(null);
              }}
              position={tagPopoverRect}
            />
          ) : null
        ) : (
          <span style={{ width: '100%', minHeight: 20, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>
            {content}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="px-20 space-y-4 min-w-0">
      {/* 테이블 UI */}
      <div style={{ minWidth: 'max-content' }}>
        <div className="flex items-center">
          {/* 이름 컬럼 */}
          <div className="flex relative items-center text-gray-500" style={{ minWidth: colWidths[0], width: colWidths[0], padding: '8px', borderLeft: 'none', borderRight: properties.length === 0 ? 'none' : '1px solid #e9e9e7' }}>
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
              className="flex relative items-center text-gray-500 group"
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
                  className="px-1 py-0 w-full text-sm bg-gray-200 rounded border border-blue-400 outline-none"
                />
              ) : (
                <div
                  className="flex items-center w-full text-gray-500"
                  onClick={() => setEditingHeader({ id: p.id, name: p.name })}
                >
                  {getPropertyIcon(p.type)}{p.name}
                </div>
              )}
              <button
                className="ml-2 text-gray-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
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
              <div className="absolute left-0 top-full z-10 mt-1" >
                <AddPropertyPopover 
                  onAddProperty={handleAddProperty} 
                />
              </div>
            )}
          </div>
        </div>
        <div>
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
        <div className="py-2">
          <Button size="sm" variant="ghost" onClick={handleAddRow}>+ 새 페이지</Button>
        </div>
      </div>
    </div>
  );
} 

export default DocumentTableView;