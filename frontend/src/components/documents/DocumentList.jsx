// src/components/documents/DocumentList.jsx
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useDocument } from '@/contexts/DocumentContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableDocumentItem({ document, currentDocument, onSelect, onDelete, id }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    boxShadow: isDragging ? '0 4px 16px rgba(0,0,0,0.12)' : undefined,
    opacity: isDragging ? 0.8 : 1,
    background: isDragging ? '#f3f4f6' : undefined,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
        currentDocument?.id === document.id ? 'bg-gray-100' : ''
      }`}
      onClick={() => onSelect(document)}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center justify-between">
        <span className="truncate">{document.title}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={e => {
            e.stopPropagation();
            onDelete(document.id);
          }}
        >
          <TrashIcon className="w-4 h-4 text-red-500" />
        </Button>
      </div>
    </Card>
  );
}

export default function DocumentList() {
  const {
    documents,
    currentDocument,
    loading,
    error,
    fetchDocuments,
    createDocument,
    deleteDocument,
    selectDocument,
    updateDocumentOrder,
  } = useDocument();

  const { currentWorkspace } = useWorkspace();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchDocuments();
    }
  }, [currentWorkspace, fetchDocuments]);

  useEffect(() => {
    setItems(documents.map(doc => doc.id));
  }, [documents]);

  const handleCreateDocument = async () => {
    try {
      const newDocument = await createDocument({
        title: '새 문서',
        content: ''
      });
      selectDocument(newDocument);
    } catch (err) {
      console.error('문서 생성 실패:', err);
    }
  };

  const handleDeleteDocument = async (id) => {
    try {
      await deleteDocument(id);
    } catch (err) {
      console.error('문서 삭제 실패:', err);
    }
  };

  // DnD 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 드래그 종료 시 순서 변경
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      try {
        await updateDocumentOrder(newItems);
        // (선택) 성공 시 fetchDocuments()로 동기화
      } catch (e) {
        alert('순서 저장에 실패했습니다.');
      }
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="p-4 text-center text-gray-500">
        워크스페이스를 선택해주세요.
      </div>
    );
  }

  if (loading) {
    return <div className="p-4">로딩 중...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">에러: {error}</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">문서</h2>
          <Button onClick={handleCreateDocument} size="sm">
            <PlusIcon className="w-4 h-4 mr-1" />
            새 문서
          </Button>
        </div>
        {documents.length === 0 ? (
          <div className="text-center text-gray-500">
            문서가 없습니다.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {items.map(id => {
                  const document = documents.find(doc => doc.id === id);
                  if (!document) return null;
                  return (
                    <SortableDocumentItem
                      key={document.id}
                      id={document.id}
                      document={document}
                      currentDocument={currentDocument}
                      onSelect={selectDocument}
                      onDelete={handleDeleteDocument}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}