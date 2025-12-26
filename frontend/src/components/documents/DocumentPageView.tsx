import { useState, useEffect, useRef, useMemo, useImperativeHandle, forwardRef, RefObject } from 'react';
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
import type { ViewType, PropertyValue } from '@/types';

interface DocumentPageViewProps {
  content: string;
  handleContentChange: (content: string) => void;
  editorRef: RefObject<{ focus: () => void }>;
  isReadOnly: boolean;
  isInitial: boolean;
  handleChangeViewType: (viewType: ViewType) => void;
}

export interface DocumentPageViewRef {
  focusFirstProperty: () => void;
}

const DocumentPageView = forwardRef<DocumentPageViewRef, DocumentPageViewProps>(({
  content,
  handleContentChange,
  editorRef,
  isReadOnly,
  isInitial,
  handleChangeViewType
}, ref) => {
  const { currentWorkspace } = useWorkspace();
  const { currentDocument } = useDocument();
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const addPropBtnRef = useRef<HTMLButtonElement>(null);
  const [editingValueId, setEditingValueId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<PropertyValue>('');
  const [tagPopoverRect, setTagPopoverRect] = useState<{ width: number; height: number; top: number; left: number } | null>(null);
  const propertyListRef = useRef<{ focusFirstProperty: () => void; focusNextProperty: (index: number) => void } | null>(null);

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

  // 외부에서 호출할 수 있는 함수들
  useImperativeHandle(ref, () => ({
    focusFirstProperty: () => {
      if (properties.length > 0 && propertyListRef.current && typeof propertyListRef.current.focusFirstProperty === 'function') {
        propertyListRef.current.focusFirstProperty();
      } else {
        // 속성이 없으면 에디터로 바로 이동
        if (editorRef?.current?.focus) {
          editorRef.current.focus();
        }
      }
    }
  }));

  const { sensors, handleColumnDragEnd } = usePropertiesDnd({
    properties,
    setProperties,
    workspaceId: currentWorkspace?.id,
    documentId: currentDocument?.id,
  });

  return (
    <div className="px-6 sm:px-8 md:px-[10vw] lg:px-[14vw] xl:px-[18vw]">
      {/* 속성 리스트 + DnD */}
      {properties.length > 0 && (
        <PagePropertyList
          ref={propertyListRef}
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
          editorRef={editorRef}
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
            <AddPropertyPopover onAddProperty={(...args: [string, string]) => { setIsAddOpen(false); return handleAddProperty(...args); }} />
          )}
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
      {isInitial && !isReadOnly && (
        <div className="flex gap-2 mt-4">
          <Button onClick={() => handleChangeViewType('TABLE')} variant="outline">테이블</Button>
          <Button onClick={() => handleChangeViewType('GALLERY')} variant="outline">갤러리</Button>
        </div>
      )}
      {/* map 루프 밖에서 단일 TagPopover만 렌더링 (TAG 타입 전용) */}
      {editingValueId && tagPopoverRect && tagPopoverRect.width > 0 && tagPopoverRect.height > 0 && (
        <TagPopover
          propertyId={editingValueId}
          value={Array.isArray(editingValue) ? JSON.stringify(editingValue) : String(editingValue)}
          tagOptions={properties.find((p) => p.id === editingValueId)?.tagOptions}
          onChange={(val: string) => {
            try {
              const parsed = JSON.parse(val);
              const valueArray = Array.isArray(parsed) ? parsed : [parsed];
              setEditingValue(valueArray);
              // 저장 및 상태 반영
              // usePageData의 handleValueChange 사용
              handleValueChange(editingValueId, valueArray);
            } catch {
              // JSON 파싱 실패 시 빈 배열
              setEditingValue([]);
              handleValueChange(editingValueId, []);
            }
          }}
          onClose={() => {
            setTagPopoverRect(null);
            setEditingValueId(null);
          }}
          onTabToNext={() => {
            setTagPopoverRect(null);
            setEditingValueId(null);
            // 다음 속성으로 이동
            if (propertyListRef.current && typeof propertyListRef.current.focusNextProperty === 'function') {
              const currentIndex = properties.findIndex(p => p.id === editingValueId);
              propertyListRef.current.focusNextProperty(currentIndex);
            }
          }}
          position={tagPopoverRect}
        />
      )}
    </div>
  );
});

DocumentPageView.displayName = 'DocumentPageView';

export default DocumentPageView;

