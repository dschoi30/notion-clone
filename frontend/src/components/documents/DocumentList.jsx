import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PlusIcon, TrashIcon, GripVertical, ChevronRight, ChevronDown, FileText, Table } from 'lucide-react';
import { useDocument } from '@/contexts/DocumentContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
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
import { createLogger } from '@/lib/logger';

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
  } = useSortable({ 
    id: document.id,
    animateLayoutChanges: () => true, // 레이아웃 변경 시 애니메이션 활성화
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.4 : 1, // 노션 스타일로 더 연하게
    zIndex: isDragging ? 1000 : 'auto',
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
          className="flex justify-center items-center p-0 mr-1 w-8 h-8 rounded cursor-grab hover:bg-gray-200"
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
          className="flex-1 items-center px-1 h-8 truncate whitespace-nowrap rounded cursor-pointer hover:bg-gray-50"
          style={{ 
            lineHeight: '2rem', 
            display: 'flex',
            alignItems: 'center',
            minWidth: 0, // flex item이 축소될 수 있도록 함
          }}
          onClick={() => onSelect(document)}
          title={document.title} // 호버 시 전체 제목 표시
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
    updateDocumentOrder,
    documentsLoading,
    currentDocument,
    error,
  } = useDocument();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const dlog = createLogger('DocumentList');

  // dnd-kit 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // 드래그 앤 드롭 핸들러
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      try {
        console.log('드래그 앤 드롭 시작:', active.id, '->', over.id);
        
        // 드래그된 문서가 개인 문서인지 공유 문서인지 확인
        const draggedDoc = documents.find(doc => doc.id === active.id);
        const targetDoc = documents.find(doc => doc.id === over.id);
        
        if (!draggedDoc || !targetDoc) return;
        
        // 개인 문서와 공유 문서를 구분
        const isPersonalDrag = draggedDoc.userId === user.id && 
          (!draggedDoc.permissions || !draggedDoc.permissions.some(p => p.userId !== user.id));
        const isPersonalTarget = targetDoc.userId === user.id && 
          (!targetDoc.permissions || !targetDoc.permissions.some(p => p.userId !== user.id));
        
        console.log('드래그 문서 타입:', isPersonalDrag ? '개인' : '공유');
        console.log('타겟 문서 타입:', isPersonalTarget ? '개인' : '공유');
        
        // 같은 카테고리 내에서만 이동 가능
        if (isPersonalDrag !== isPersonalTarget) {
          console.log('개인 문서와 공유 문서 간 이동은 불가능합니다.');
          return;
        }
        
        // 해당 카테고리의 문서들만 가져오기
        const categoryDocuments = isPersonalDrag ? personalDocuments : sharedDocuments;
        const oldIndex = categoryDocuments.findIndex(doc => doc.id === active.id);
        const newIndex = categoryDocuments.findIndex(doc => doc.id === over.id);
        
        console.log('카테고리 문서 수:', categoryDocuments.length);
        console.log('이전 인덱스:', oldIndex, '새 인덱스:', newIndex);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(categoryDocuments, oldIndex, newIndex);
          const documentIds = newOrder.map(doc => doc.id);
          
          console.log('새로운 순서:', documentIds);
          
          // DocumentContext의 updateDocumentOrder 사용
          await updateDocumentOrder(documentIds);
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
  const { sharedDocuments, personalDocuments } = useMemo(() => {
    dlog.info('문서 분류 및 정렬 시작:', documents.length, '개 문서');
    
    const shared = documents.filter(doc =>
      doc.parentId == null &&
      (doc.userId !== user.id || (doc.permissions && doc.permissions.some(p => p.userId !== user.id)))
    ).sort((a, b) => {
      // sortOrder로 정렬 (null 값은 맨 뒤로)
      const sortOrderA = a.sortOrder;
      const sortOrderB = b.sortOrder;
      
      if (sortOrderA == null && sortOrderB == null) return 0;
      if (sortOrderA == null) return 1;
      if (sortOrderB == null) return -1;
      return sortOrderA - sortOrderB;
    });
    
    const personal = documents.filter(doc =>
      doc.parentId == null &&
      doc.userId === user.id &&
      (!doc.permissions || !doc.permissions.some(p => p.userId !== user.id))
    ).sort((a, b) => {
      // sortOrder로 정렬 (null 값은 맨 뒤로)
      const sortOrderA = a.sortOrder;
      const sortOrderB = b.sortOrder;
      
      if (sortOrderA == null && sortOrderB == null) return 0;
      if (sortOrderA == null) return 1;
      if (sortOrderB == null) return -1;
      return sortOrderA - sortOrderB;
    });
    
    dlog.info('공유 문서:', shared.map(d => ({ id: d.id, title: d.title, sortOrder: d.sortOrder })));
    dlog.info('개인 문서:', personal.map(d => ({ id: d.id, title: d.title, sortOrder: d.sortOrder })));
    
    return { sharedDocuments: shared, personalDocuments: personal };
  }, [documents, user.id]);

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
      handleSelectDocument(newDocument);
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
    navigate(`/${document.id}-${slugify(document.title || 'untitled')}`);
    selectDocument(document);
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
            <Button onClick={handleCreateDocument} size="sm">
              <PlusIcon className="mr-1 w-4 h-4" /> 새 문서
            </Button>
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