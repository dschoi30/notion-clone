// src/components/documents/DocumentList.jsx
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon, TrashIcon, GripVertical, ArrowLeft, ChevronRight, ChevronDown, FileText, Table } from 'lucide-react';
import { useDocument } from '@/contexts/DocumentContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { updateDocumentOrder } from '@/services/documentApi';
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
import { useNavigate } from 'react-router-dom';
import { slugify } from '@/lib/utils';

function SortableDocumentTreeItem({ document, currentDocument, onSelect, onDelete, openedIds, setOpenedIds, childrenMap, setChildrenMap, fetchChildDocuments, level = 0, idPath = [] }) {
  const [hovered, setHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const children = childrenMap[document.id] || [];
  const hasChildren = children.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: document.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (openedIds.has(document.id)) {
      setOpenedIds(prev => {
        const next = new Set(prev);
        next.delete(document.id);
        return next;
      });
    } else {
      setOpenedIds(prev => new Set(prev).add(document.id));
      if (!childrenMap[document.id]) {
        setLoading(true);
        const docs = await fetchChildDocuments(document.id);
        setChildrenMap(prev => ({ ...prev, [document.id]: docs }));
        setLoading(false);
      }
    }
  };

  const Icon = document.viewType === 'TABLE' ? Table : FileText;

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          ...style,
          paddingLeft: level * 20,
          background: idPath.includes(document.id)
            ? '#F0F0EF'
            : hovered
              ? '#F1F1EF'
              : undefined
        }}
        className="flex items-center min-w-0 h-8 transition-colors group"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* 드래그 핸들 */}
        <div
          {...attributes}
          {...listeners}
          className="flex justify-center items-center p-0 mr-1 w-8 h-8 rounded cursor-move hover:bg-gray-200"
          style={{ minWidth: 32 }}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        
        {document.hasChildren ? (
          hovered ? (
            <button
              onClick={handleToggle}
              className="flex justify-center items-center p-0 mr-1 w-8 h-8"
              style={{ minWidth: 32 }}
            >
              {openedIds.has(document.id)
                ? <ChevronDown className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="flex justify-center items-center mr-1 w-8 h-8">
              <Icon className="w-4 h-4 text-gray-400" />
            </span>
          )
        ) : (
          <span className="flex justify-center items-center mr-1 w-8 h-8">
            <Icon className="w-4 h-4 text-gray-400" />
          </span>
        )}
        <span
          className="flex overflow-hidden flex-1 items-center h-8 whitespace-nowrap cursor-pointer text-ellipsis"
          style={{ lineHeight: '2rem', display: 'block' }}
          onClick={() => onSelect(document)}
        >
          {document.title}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={e => {
            e.stopPropagation();
            onDelete(document.id);
          }}
          className="hidden justify-center items-center p-0 w-8 h-8 group-hover:flex"
          style={{ minWidth: 32 }}
        >
          <TrashIcon className="w-4 h-4 text-red-500" />
        </Button>
      </div>
      {openedIds.has(document.id) && (loading ? (
        <div className="pl-8 text-sm text-gray-400">로딩 중...</div>
      ) : (
        children.map(child => (
          <SortableDocumentTreeItem
            key={child.id}
            document={child}
            currentDocument={currentDocument}
            onSelect={onSelect}
            onDelete={onDelete}
            openedIds={openedIds}
            setOpenedIds={setOpenedIds}
            childrenMap={childrenMap}
            setChildrenMap={setChildrenMap}
            fetchChildDocuments={fetchChildDocuments}
            level={level + 1}
            idPath={idPath}
          />
        ))
      ))}
    </>
  );
}

export default function DocumentList() {
  const {
    documents,
    fetchDocuments,
    fetchChildDocuments,
    createDocument,
    deleteDocument,
    selectDocument,
    documentsLoading,
    currentDocument,
    error,
  } = useDocument();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();

  // dnd-kit 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 드래그 앤 드롭 핸들러
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      try {
        // 현재 문서 목록에서 순서 변경
        const oldIndex = documents.findIndex(doc => doc.id === active.id);
        const newIndex = documents.findIndex(doc => doc.id === over.id);
        
        // 최상위 문서만 순서 변경 가능 (parentId가 null인 문서들)
        const topLevelDocuments = documents.filter(doc => doc.parentId === null);
        const oldTopIndex = topLevelDocuments.findIndex(doc => doc.id === active.id);
        const newTopIndex = topLevelDocuments.findIndex(doc => doc.id === over.id);
        
        if (oldTopIndex !== -1 && newTopIndex !== -1) {
          const newOrder = arrayMove(topLevelDocuments, oldTopIndex, newTopIndex);
          const documentIds = newOrder.map(doc => doc.id);
          
          // 백엔드에 순서 업데이트
          await updateDocumentOrder(currentWorkspace.id, documentIds);
        }
      } catch (err) {
        console.error('문서 순서 변경 실패:', err);
        alert('문서 순서 변경에 실패했습니다.');
      }
    }
  };

  useEffect(() => {
    if (currentWorkspace) {
      fetchDocuments();
    }
  }, [currentWorkspace, fetchDocuments]);

  // 공유/개인 문서 분류 (최상위 문서만)
  // 백엔드에서 이미 접근 가능한 문서만 필터링해서 보내주므로, 프론트에서는 단순 분류만 수행
  const sharedDocuments = documents.filter(doc =>
    doc.parentId == null &&
    (doc.userId !== user.id || (doc.permissions && doc.permissions.some(p => p.userId !== user.id)))
  );
  const personalDocuments = documents.filter(doc =>
    doc.parentId == null &&
    doc.userId === user.id &&
    (!doc.permissions || !doc.permissions.some(p => p.userId !== user.id))
  );

  const [openedIds, setOpenedIds] = useState(new Set());
  const [childrenMap, setChildrenMap] = useState({}); // { [parentId]: [children] }

  // 선택된 문서에서 루트까지 id 경로 계산
  const [idPath, setIdPath] = useState([]);
  useEffect(() => {
    if (!currentDocument) {
      setIdPath([]);
      return;
    }
    const path = [];
    let doc = currentDocument;
    while (doc) {
      path.unshift(doc.id);
      doc = documents.find(d => d.id === doc.parentId);
    }
    setIdPath(path);
  }, [currentDocument, documents]);

  // 새 문서 생성 (최상위에 생성)
  const handleCreateDocument = async () => {
    try {
      const newDocument = await createDocument({
        title: '',
        content: '',
        parentId: null,
        viewType: 'PAGE',
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

  // 문서 클릭 시 라우팅
  const handleSelectDocument = (document) => {
    selectDocument(document);
    navigate(`/${document.id}-${slugify(document.title)}`);
  };

  if (!currentWorkspace) {
    return (
      <div className="p-4 text-center text-gray-500">
        워크스페이스를 선택해주세요.
      </div>
    );
  }

  if (documentsLoading) {
    return <div className="p-4">로딩 중...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">에러: {error}</div>;
  }

  return (
    <div className="overflow-y-auto flex-1">
      <div className="p-4 space-y-8">
        {/* 공유 문서 섹션 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">공유 문서</h2>
            <Button onClick={handleCreateDocument} size="sm">
              <PlusIcon className="mr-1 w-4 h-4" /> 새 문서
            </Button>
          </div>
          {sharedDocuments.length === 0 ? (
            <div className="text-center text-gray-500">공유 문서가 없습니다.</div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sharedDocuments.map(doc => doc.id)}
                strategy={verticalListSortingStrategy}
              >
                {sharedDocuments.map(document => (
                  <SortableDocumentTreeItem
                    key={document.id}
                    document={document}
                    currentDocument={currentDocument}
                    onSelect={handleSelectDocument}
                    onDelete={handleDeleteDocument}
                    openedIds={openedIds}
                    setOpenedIds={setOpenedIds}
                    childrenMap={childrenMap}
                    setChildrenMap={setChildrenMap}
                    fetchChildDocuments={fetchChildDocuments}
                    idPath={idPath}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
        {/* 개인 문서 섹션 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">개인 문서</h2>
          </div>
          {personalDocuments.length === 0 ? (
            <div className="text-center text-gray-500">개인 문서가 없습니다.</div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={personalDocuments.map(doc => doc.id)}
                strategy={verticalListSortingStrategy}
              >
                {personalDocuments.map(document => (
                  <SortableDocumentTreeItem
                    key={document.id}
                    document={document}
                    currentDocument={currentDocument}
                    onSelect={handleSelectDocument}
                    onDelete={handleDeleteDocument}
                    openedIds={openedIds}
                    setOpenedIds={setOpenedIds}
                    childrenMap={childrenMap}
                    setChildrenMap={setChildrenMap}
                    fetchChildDocuments={fetchChildDocuments}
                    idPath={idPath}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}