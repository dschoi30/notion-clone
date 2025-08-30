import { React, useState, useEffect, useRef, useMemo } from 'react';
import Editor from '@/components/editor/Editor';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useDocument } from '@/contexts/DocumentContext';
import AddPropertyPopover from './AddPropertyPopover';
import PageHeaderArea from './page/PageHeaderArea';
import PagePropertyList from './page/PagePropertyList';
import { usePropertiesDnd } from '@/components/documents/shared/hooks/usePropertiesDnd';
import usePageData from './page/hooks/usePageData';
import TagPopover from './TagPopover';
import { Button } from '@/components/ui/button';
import { buildSystemPropTypeMapForPage } from '@/components/documents/shared/systemPropTypeMap';

const DocumentPageView = ({
  content,
  handleContentChange,
  editorRef,
  isReadOnly,
  isInitial,
  handleChangeViewType
}) => {
  const { currentWorkspace } = useWorkspace();
  const { currentDocument } = useDocument();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const addPropBtnRef = useRef(null);
  const [editingValueId, setEditingValueId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [tagPopoverRect, setTagPopoverRect] = useState(null);

  const systemPropTypeMap = useMemo(() => (
    buildSystemPropTypeMapForPage(currentDocument)
  ), [
    currentDocument?.createdBy,
    currentDocument?.updatedBy,
    currentDocument?.createdAt,
    currentDocument?.updatedAt,
  ]);

  const {
    properties,
    setProperties,
    valuesByPropertyId,
    editingHeader,
    setEditingHeader,
    handleAddProperty,
    handleHeaderNameChange,
    handleValueChange,
  } = usePageData({
    workspaceId: currentWorkspace?.id,
    documentId: currentDocument?.id,
    systemPropTypeMap: systemPropTypeMap,
  });

  useEffect(() => {
    setTagPopoverRect(null);
  }, [currentWorkspace?.id, currentDocument?.id]);

  const { sensors, handleColumnDragEnd } = usePropertiesDnd({
    properties,
    setProperties,
    workspaceId: currentWorkspace?.id,
    documentId: currentDocument?.id,
  });

  return (
    <div className="px-20">
      {/* 속성 리스트 + DnD */}
      {properties.length > 0 && (
        <PagePropertyList
          properties={properties}
          valuesByPropertyId={valuesByPropertyId}
          sensors={sensors}
          onDragEnd={handleColumnDragEnd}
          editingHeader={editingHeader}
          setEditingHeader={setEditingHeader}
          onHeaderCommit={handleHeaderNameChange}
          editingValueId={editingValueId}
          setEditingValueId={setEditingValueId}
          editingValue={editingValue}
          setEditingValue={setEditingValue}
          onValueCommit={handleValueChange}
          tagPopoverRect={tagPopoverRect}
          setTagPopoverRect={setTagPopoverRect}
          isReadOnly={isReadOnly}
        />
      )}

      {/* Read-only일 때 목록과 에디터 사이 구분선 */}
      {isReadOnly && properties.length > 0 && (
        <div className="my-4 border-t border-gray-200" />
      )}

      {/* 속성 추가 버튼: 리스트 하단 고정 */}
      {!isReadOnly && (
        <PageHeaderArea
          addBtnRef={addPropBtnRef}
          isAddOpen={isAddOpen}
          setIsAddOpen={setIsAddOpen}
          AddPropertyPopoverComponent={() => (
            <AddPropertyPopover onAddProperty={(...args) => { setIsAddOpen(false); return handleAddProperty(...args); }} />
          )}
          disabled={false}
        />
      )}

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
      {/* map 루프 밖에서 단일 TagPopover만 렌더링 (TAG 타입 전용) */}
      {editingValueId && tagPopoverRect && tagPopoverRect.width > 0 && tagPopoverRect.height > 0 && (
        <TagPopover
          propertyId={editingValueId}
          value={editingValue}
          tagOptions={properties.find((p) => p.id === editingValueId)?.tagOptions}
          onChange={(val) => {
            setEditingValue(val);
            // 저장 및 상태 반영
            // usePageData의 handleValueChange 사용
            handleValueChange(editingValueId, val);
          }}
          onClose={() => {
            setTagPopoverRect(null);
            setEditingValueId(null);
          }}
          position={tagPopoverRect}
        />
      )}
    </div>
  );
};

export default DocumentPageView; 