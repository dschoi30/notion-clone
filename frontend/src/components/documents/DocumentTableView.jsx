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
import { TAG_COLORS as COLORS, getColorObj } from '@/lib/colors';

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



export default function DocumentTableView({ workspaceId, documentId, titleColumnWidth, propertyWidths }) {
  const [properties, setProperties] = useState([]); // [{ id, name, type }]
  const [rows, setRows] = useState([]); // [{ id, title, values: { [propertyId]: value }, document }]
  const [editingCell, setEditingCell] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [editingHeader, setEditingHeader] = useState({ id: null, name: '' });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const addBtnRef = useRef(null);
  const defaultWidth = 192; // 12rem
  const [colWidths, setColWidths] = useState(() => [titleColumnWidth || 288, ...(propertyWidths && propertyWidths.length ? propertyWidths : properties.map(() => defaultWidth))]);
  const liveWidths = useRef(colWidths);

  // property별 태그 옵션 목록 관리
  const [tagOptions, setTagOptions] = useState({}); // { [propertyId]: [{label, color}] }
  const handleAddTagOption = (propertyId, tag) => {
    setTagOptions(prev => ({
      ...prev,
      [propertyId]: prev[propertyId]?.some(t => t.label === tag.label)
        ? prev[propertyId]
        : [...(prev[propertyId] || []), tag]
    }));
  };

  // 태그 옵션(이름/색상) 변경 시 tagOptions와 모든 행(tags) 동기화
  const handleEditTagOption = (propertyId, oldTag, newTag) => {
    setTagOptions(prev => ({
      ...prev,
      [propertyId]: prev[propertyId].map(t =>
        (t.label === oldTag.label) ? newTag : t
      )
    }));
    setRows(prevRows => prevRows.map(row => {
      const tagsVal = row.values[propertyId];
      if (!tagsVal) return row;
      let tags = [];
      try { tags = JSON.parse(tagsVal); } catch {}
      let changed = false;
      const newTags = tags.map(t => {
        if (t.label === oldTag.label) { changed = true; return { ...newTag }; }
        if (!t.color) return { ...t, color: 'default' };
        return t;
      });
      return changed ? { ...row, values: { ...row.values, [propertyId]: JSON.stringify(newTags) } } : row;
    }));
  };

  const handleRemoveTagOption = (propertyId, tag) => {
    setTagOptions(prev => ({
      ...prev,
      [propertyId]: prev[propertyId].filter(t => t.label !== tag.label)
    }));
    setRows(prevRows => prevRows.map(row => {
      const tagsVal = row.values[propertyId];
      if (!tagsVal) return row;
      let tags = [];
      try { tags = JSON.parse(tagsVal); } catch {}
      const newTags = tags.filter(t => t.label !== tag.label);
      return { ...row, values: { ...row.values, [propertyId]: JSON.stringify(newTags) } };
    }));
  };

  useEffect(() => {
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

  const SYSTEM_PROP_TYPES = ['CREATED_BY', 'LAST_UPDATED_BY', 'CREATED_AT', 'LAST_UPDATED_AT'];

  const cellRefs = useRef({}); // {rowId_propertyId: ref}

  const { selectDocument } = useDocument();

  // TABLE 문서의 자식(PAGE) 문서들의 property/row/value fetch
  useEffect(() => {
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
    fetchTableData();
  }, [workspaceId, documentId]);

  const renderCell = (row, property, idx, isNameCell = false, rowIdx = 0) => {
    const rowId = row.id;
    const propertyId = isNameCell ? null : property?.id;
    const isEditing = editingCell && editingCell.rowId === rowId && editingCell.propertyId === propertyId;
    const isHovered = hoveredCell && hoveredCell.rowId === rowId && hoveredCell.propertyId === propertyId;
    let value = isNameCell ? row.title : (property ? row.values[property.id] || '' : '');
    // 이름 셀(타이틀 셀) 처리
    if (isNameCell) {
      return (
        <div
          key={'name'}
          className="notion-table-view-cell"
          style={{
            display: 'flex',
            width: colWidths[0],
            minWidth: 80,
            minHeight: '36px',
            height: '100%',
            alignItems: 'flex-start',
            fontSize: '14px',
            padding: '8px',
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
            position: 'relative',
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
              className="px-2 py-1 w-full rounded border outline-none"
              style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
              value={value}
              onChange={e => handleCellValueChange(rowId, null, e.target.value)}
              onBlur={() => setEditingCell(null)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingCell(null); }}
            />
          ) : (
            <>
              <span style={{ width: '100%', minHeight: 20, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', paddingBottom: 2, whiteSpace: 'nowrap' }}>{value}</span>
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
      value = formatKoreanDateTime(value);
    }
    // TAG 타입은 pill로 렌더링
    if (property.type === 'TAG') {
      let tags = [];
      try {
        tags = value ? JSON.parse(value) : [];
      } catch {}
      // 태그 옵션 목록에 없는 태그가 있으면 추가
      tags.forEach(tag => {
        if (!((tagOptions[property.id] || []).some(t => t.label === tag.label))) {
          handleAddTagOption(property.id, tag);
        }
      });
      value = (
        <div
          className="flex gap-1"
          style={{
            minWidth: 0,
            overflowX: 'hidden',
            whiteSpace: 'nowrap',
            flexWrap: 'nowrap',
            alignItems: 'center'
          }}
        >
          {tags.map(tag => {
            const colorObj = getColorObj(tag.color || 'default');
            return (
              <span
                key={tag.label}
                className={`inline-flex items-center px-2 py-1 rounded text-xs ${colorObj.bg} border ${colorObj.border}`}
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flexShrink: 0,
                  maxWidth: 120
                }}
              >
                {tag.label}
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
        className="notion-table-view-cell"
        style={{
          display: 'flex',
          width: colWidths[isNameCell ? 0 : 1 + idx],
          minWidth: 80,
          minHeight: '36px',
          height: '100%',
          alignItems: 'flex-start',
          fontSize: '14px',
          padding: '8px',
          borderTop: isNameCell ? (rowIdx === 0 ? '1px solid #e9e9e7' : 'none') : (rowIdx === 0 ? '1px solid #e9e9e7' : 'none'),
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
          position: 'relative',
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
              className="px-2 py-1 w-full rounded border outline-none"
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
              className="px-2 py-1 w-full rounded border outline-none"
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
              value={row.values[property.id] || ''}
              options={(tagOptions[property.id] || []).map(opt => {
                let color = opt.color;
                if (!color && opt.label) {
                  const found = COLORS.find(c => c.name === opt.label);
                  color = found ? found.value : 'default';
                }
                return { label: opt.label, color: color || 'default' };
              })}
              onAddOption={tag => handleAddTagOption(property.id, tag)}
              onEditOption={(oldTag, newTag) => handleEditTagOption(property.id, oldTag, newTag)}
              onRemoveOption={tag => handleRemoveTagOption(property.id, tag)}
              onChange={val => handleCellValueChange(rowId, property.id, val)}
              onClose={() => setEditingCell(null)}
            />
          ) : null
        ) : (
          <span style={{ width: '100%', minHeight: 20, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', paddingBottom: 2, whiteSpace: 'nowrap' }}>
            {property.type === 'TAG' ? (
              (() => {
                let tags = [];
                try { tags = row.values[property.id] ? JSON.parse(row.values[property.id]) : []; } catch {}
                tags = tags.map(t => ({ ...t, color: t.color || 'default' }));
                tags.forEach(tag => {
                  if (!((tagOptions[property.id] || []).some(t => t.label === tag.label))) {
                    handleAddTagOption(property.id, tag);
                  }
                });
                return (
                  <div
                    className="flex gap-1"
                    style={{
                      minWidth: 0,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      flexWrap: 'nowrap',
                      alignItems: 'center'
                    }}
                  >
                    {tags.map(tag => {
                      const colorObj = getColorObj(tag.color || 'default');
                      return (
                        <span
                          key={tag.label}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${colorObj.bg} border ${colorObj.border}`}
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flexShrink: 0,
                            maxWidth: 120
                          }}
                        >
                          {tag.label}
                        </span>
                      );
                    })}
                  </div>
                );
              })()
            ) : property.type === 'CREATED_AT' || property.type === 'LAST_UPDATED_AT' ? (
              formatKoreanDateTime(row.values[property.id])
            ) : (
              row.values[property.id] || ''
            )}
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
          <div className="flex relative items-center font-semibold" style={{ minWidth: colWidths[0], width: colWidths[0], padding: '8px', borderLeft: 'none', borderRight: properties.length === 0 ? 'none' : '1px solid #e9e9e7' }}>
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
              className="flex relative items-center font-semibold group"
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
                  className="flex items-center w-full"
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
      </div></div>
  );
} 