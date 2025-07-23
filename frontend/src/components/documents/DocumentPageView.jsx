import { React, useState, useEffect, useRef } from 'react';
import AddPropertyPopover from './AddPropertyPopover';
import { Button } from '@/components/ui/button';
import Editor from '@/components/editor/Editor';
import { formatKoreanDateTime } from '@/lib/utils';
import { getColorObj } from '@/lib/colors';
import { getProperties, getPropertyValuesByDocument, addProperty, addOrUpdatePropertyValue, updateProperty, getDocument } from '@/services/documentApi';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useDocument } from '@/contexts/DocumentContext';
import DatePopover from './DatePopover';
import TagPopover from './TagPopover';
import { useDocumentPropertiesStore } from '@/hooks/useDocumentPropertiesStore';

const DocumentPageView = ({
  addPropBtnRef,
  isAddPropOpen,
  setIsAddPropOpen,
  content,
  handleContentChange,
  editorRef,
  isReadOnly,
  isInitial,
  handleChangeViewType
}) => {
  const { currentWorkspace } = useWorkspace();
  const { currentDocument } = useDocument();
  const properties = useDocumentPropertiesStore(state => state.properties);
  const setProperties = useDocumentPropertiesStore(state => state.setProperties);
  const [propertyValues, setPropertyValues] = useState({});
  const [editingHeaderId, setEditingHeaderId] = useState(null);
  const [editingHeaderName, setEditingHeaderName] = useState('');
  const [editingValueId, setEditingValueId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [hoveredHeaderId, setHoveredHeaderId] = useState(null);
  const [hoveredValueId, setHoveredValueId] = useState(null);
  const [tagPopoverRect, setTagPopoverRect] = useState(null);
  const tagCellRefs = useRef({});
  // 속성 목록/값 조회 함수 분리
  const fetchAndSetProperties = async () => {
    if (!currentWorkspace?.id || !currentDocument?.id) return;
    const props = await getProperties(currentWorkspace.id, currentDocument.id);
    setProperties(props);
    const valuesArr = await getPropertyValuesByDocument(currentWorkspace.id, currentDocument.id);
    const valuesObj = {};
    valuesArr.forEach(v => { valuesObj[v.propertyId] = v.value; });
    setPropertyValues(valuesObj);
  };

  useEffect(() => {
    fetchAndSetProperties();
  }, [currentWorkspace?.id, currentDocument?.id]);

  useEffect(() => {
    if (!isInitial) return;
    async function fetchInitialData() {
      if (!currentWorkspace?.id || !currentDocument?.id) return;
      const doc = await getDocument(currentWorkspace.id, currentDocument.id);
      if (doc.properties) setProperties(doc.properties);
    }
    fetchInitialData();
    isInitial = false;
  }, [currentWorkspace?.id, currentDocument?.id, setProperties]);

  useEffect(() => {
    // 문서나 워크스페이스가 바뀌면 태그 팝오버 상태 초기화
    // setEditingValueId(null);
    setTagPopoverRect(null);
  }, [currentWorkspace?.id, currentDocument?.id]);

  const handleAddProperty = async (name, type) => {
    if (!name || !type) return;
    try {
      const newProperty = await addProperty(currentWorkspace.id, currentDocument.id, { name, type, sortOrder: properties.length });
      setIsAddPropOpen(false);
      const SYSTEM_PROP_TYPE_MAP = {
        CREATED_BY: doc => doc.createdBy || '',
        LAST_UPDATED_BY: doc => doc.updatedBy || '',
        CREATED_AT: doc => doc.createdAt || '',
        LAST_UPDATED_AT: doc => doc.updatedAt || '',
      };
      let newValue = '';
      if (SYSTEM_PROP_TYPE_MAP[type]) {
        newValue = SYSTEM_PROP_TYPE_MAP[type](currentDocument);
        await addOrUpdatePropertyValue(currentWorkspace.id, currentDocument.id, newProperty.id, newValue);
      } else {
        await addOrUpdatePropertyValue(currentWorkspace.id, currentDocument.id, newProperty.id, '');
      }
      // 값(propertyValues)도 갱신
      await fetchAndSetProperties();
    } catch (e) {
      alert('속성 추가 실패');
    }
  };

  // 속성명 저장
  const handleHeaderNameChange = async () => {
    if (!editingHeaderId || !editingHeaderName) {
      setEditingHeaderId(null);
      setEditingHeaderName('');
      return;
    }
    try {
      await updateProperty(currentWorkspace.id, editingHeaderId, editingHeaderName);
      await fetchAndSetProperties();
    } catch (e) {
      alert('속성 이름 변경 실패');
    } finally {
      setEditingHeaderId(null);
      setEditingHeaderName('');
    }
  };

  // 속성값 저장
  const handleValueChange = async (propertyId, value) => {
    console.log('handleValueChange', propertyId, value);
    setEditingValue(value);
  };
  const handleValueSave = async (propertyId, value) => {
    if (!propertyId) {
      alert('propertyId가 없습니다!');
      return;
    }
    try {
      await addOrUpdatePropertyValue(currentWorkspace.id, currentDocument.id, propertyId, value);
      await fetchAndSetProperties();
    } catch (e) {
      alert('값 저장 실패');
    } finally {
      // setEditingValueId(null);
      // setEditingValue('');
    }
  };

  const SYSTEM_PROP_TYPES = ['CREATED_BY', 'LAST_UPDATED_BY', 'CREATED_AT', 'LAST_UPDATED_AT'];

  return (
    <div className="px-20">
      {/* 속성명/값 목록 + 속성 추가 버튼 (PAGE에서만) */}
      {properties.length > 0 && (
        <div className="flex flex-col">
          {properties.map((prop) => {
            let value = propertyValues[prop.id] || '';
            let content = null;
            // 속성값 인라인 수정 UI
            const isEditingValue = editingValueId === prop.id;
            if (isEditingValue && !SYSTEM_PROP_TYPES.includes(prop.type)) {
              if (prop.type === 'TEXT') {
                content = (
                  <input
                    autoFocus
                    className="px-2 py-1 w-full rounded border outline-none"
                    style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
                    value={editingValue}
                    onChange={e => handleValueChange(prop.id, e.target.value)}
                    onBlur={() => handleValueSave(prop.id, editingValue)}
                    onKeyDown={e => { if (e.key === 'Enter') handleValueSave(prop.id, editingValue); }}
                  />
                );
              } else if (prop.type === 'NUMBER') {
                content = (
                  <input
                    type="number"
                    autoFocus
                    className="px-2 py-1 w-full rounded border outline-none"
                    style={{ background: '#fff', border: '1.5px solid #bdbdbd' }}
                    value={editingValue}
                    onChange={e => handleValueChange(prop.id, e.target.value)}
                    onBlur={() => handleValueSave(prop.id, editingValue)}
                    onKeyDown={e => { if (e.key === 'Enter') handleValueSave(prop.id, editingValue); }}
                  />
                );
              } else if (prop.type === 'DATE') {
                content = (
                  <DatePopover
                    value={editingValue}
                    onChange={val => {
                      setEditingValue(val);
                      handleValueSave(prop.id, val);
                    }}
                    onClose={() => handleValueSave(prop.id, editingValue)}
                  />
                );
              } else if (prop.type === 'TAG') {
                content = null;
              }
            } else if (prop.type === 'DATE' || prop.type === 'CREATED_AT' || prop.type === 'LAST_UPDATED_AT') {
              content = value ? formatKoreanDateTime(value) : '';
            } else if (prop.type === 'TAG') {
              let tags = [];
              try { tags = value ? JSON.parse(value) : []; } catch {}
              const tagOptions = properties.find(p => p.id === prop.id)?.tagOptions || [];
              console.log('tags',tags)
              content = (
                <div className="flex gap-1">
                  {tags.map(tagId => {
                    // tagId가 id(숫자/문자열)이면 tagOptions에서 찾아오기
                    const tagObj = tagOptions.find(opt => opt.id === tagId);
                    if (!tagObj) return null;
                    const colorObj = getColorObj(tagObj.color || 'default');
                    return (
                      <span
                        key={tagObj.id}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-sm ${colorObj.bg} border ${colorObj.border}`}
                        style={{ whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        {tagObj.label}
                      </span>
                    );
                  })}
                </div>
              );
            } else {
              content = value;
            }
            // 속성명 인라인 수정 UI
            const isEditingHeader = editingHeaderId === prop.id;
            return (
              <div
                key={prop.id}
                className="flex items-center min-w-[120px] py-1 px-2 rounded transition-colors"
                style={{ minHeight: 36 }}
              >
                {isEditingHeader && !SYSTEM_PROP_TYPES.includes(prop.type) ? (
                  <input
                    autoFocus
                    className="px-1 py-0 w-[120px] text-sm bg-gray-200 rounded border border-blue-400 outline-none"
                    value={editingHeaderName}
                    onChange={e => setEditingHeaderName(e.target.value)}
                    onBlur={handleHeaderNameChange}
                    onKeyDown={e => e.key === 'Enter' && handleHeaderNameChange()}
                  />
                ) : (
                  <span
                    className="text-sm text-gray-500 font-medium mr-4 w-[140px] text-ellipsis transition-colors"
                    onClick={() => {
                      if (!SYSTEM_PROP_TYPES.includes(prop.type)) {
                        setEditingHeaderId(prop.id);
                        setEditingHeaderName(prop.name);
                      }
                    }}
                    onMouseEnter={() => setHoveredHeaderId(prop.id)}
                    onMouseLeave={() => setHoveredHeaderId(null)}
                    style={{
                      cursor: SYSTEM_PROP_TYPES.includes(prop.type) ? 'default' : 'pointer',
                      background: hoveredHeaderId === prop.id ? '#f5f5f5' : 'transparent',
                      borderRadius: 4,
                      padding: '2px 4px',
                      minHeight: 32,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {prop.name}
                  </span>
                )}
                <span
                  ref={el => { if (prop.type === 'TAG') tagCellRefs.current[prop.id] = el; }}
                  className="relative flex-1 text-sm text-gray-900 break-all transition-colors"
                  onClick={e => {
                    if (!SYSTEM_PROP_TYPES.includes(prop.type)) {
                      if (prop.type === 'TAG') {
                        const rect = tagCellRefs.current[prop.id]?.getBoundingClientRect();
                        if (rect && rect.width > 0 && rect.height > 0) {
                          // setTimeout(() => {
                          if (editingValueId !== prop.id || editingValue !== value) {
                            setEditingValueId(prop.id);
                            setEditingValue(value);
                            setTagPopoverRect({
                              top: rect.top + window.scrollY,
                              left: rect.left + window.scrollX,
                              width: rect.width,
                              height: rect.height,
                            });
                          }
                          // }, 0);
                        }
                      } else {
                        setEditingValueId(prop.id);
                        setEditingValue(value);
                      }
                    }
                  }}
                  onMouseEnter={() => setHoveredValueId(prop.id)}
                  onMouseLeave={() => setHoveredValueId(null)}
                  style={{
                    cursor: SYSTEM_PROP_TYPES.includes(prop.type) ? 'default' : 'pointer',
                    background: hoveredValueId === prop.id ? '#f5f5f5' : 'transparent',
                    borderRadius: 4,
                    padding: '2px 4px',
                    minHeight: 32,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {content}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {/* 속성 추가 버튼 */}
      <div className="relative">
        <Button ref={addPropBtnRef} size="sm" variant="ghost" className="px-2 text-sm text-gray-500" onClick={() => setIsAddPropOpen(v => !v)}>
          + 속성 추가
        </Button>
        {isAddPropOpen && (
          <div className="absolute left-0 top-full z-10 mt-1" >
            <AddPropertyPopover onAddProperty={handleAddProperty} />
          </div>
        )}
      </div>
      {/* 에디터 */}
      <Editor 
        content={content} 
        onUpdate={handleContentChange}
        ref={editorRef}
        editable={!isReadOnly}
      />
      {/* 최초 생성 상태에서만 하단 버튼 노출 */}
      {isInitial && (
        <div className="flex gap-2 mt-4">
          <Button onClick={() => handleChangeViewType('TABLE')} variant="outline">테이블</Button>
          <Button onClick={() => handleChangeViewType('GALLERY')} variant="outline">갤러리</Button>
        </div>
      )}
      {/* map 루프 밖에서 단일 TagPopover만 렌더링 */}
      {editingValueId && tagPopoverRect && tagPopoverRect.width > 0 && tagPopoverRect.height > 0 && (
        <TagPopover
          propertyId={editingValueId}
          value={editingValue}
          tagOptions={properties.find(p => p.id === editingValueId)?.tagOptions}
          onChange={val => { setEditingValue(val); handleValueSave(editingValueId, val); }}
          onClose={() => {
            // handleValueSave(editingValueId, editingValue);
            setTagPopoverRect(null);
            setEditingValueId(null);
            fetchAndSetProperties();
          }}
          position={tagPopoverRect}
        />
      )}
    </div>
  );
};

export default DocumentPageView; 