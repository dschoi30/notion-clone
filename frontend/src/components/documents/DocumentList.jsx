import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PlusIcon, TrashIcon, GripVertical, ChevronRight, ChevronDown, FileText, Table } from 'lucide-react';
import { useDocument } from '@/contexts/DocumentContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
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
        const docs = await fetchChildDocuments(document.id, { silent: true }); // DocumentList 깜빡임 방지를 위해 silent 옵션 사용
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
          className="flex-1 items-center px-1 h-8 truncate whitespace-nowrap rounded cursor-pointer"
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
  const { handleError } = useErrorHandler();
  
  // 스크롤 컨테이너 참조
  const scrollContainerRef = useRef(null);
  
  // 스크롤을 맨 아래로 이동하는 함수
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      setTimeout(() => {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100); // DOM 업데이트 후 스크롤
    }
  };

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
        // 드래그된 문서가 개인 문서인지 공유 문서인지 확인
        const draggedDoc = documents.find(doc => doc.id === active.id);
        const targetDoc = documents.find(doc => doc.id === over.id);
        
        if (!draggedDoc || !targetDoc) return;
        
        // 개인 문서와 공유 문서를 구분
        const isPersonalDrag = draggedDoc.userId === user.id && 
          (!draggedDoc.permissions || !draggedDoc.permissions.some(p => p.userId !== user.id));
        const isPersonalTarget = targetDoc.userId === user.id && 
          (!targetDoc.permissions || !targetDoc.permissions.some(p => p.userId !== user.id));
        
        // 같은 카테고리 내에서만 이동 가능
        if (isPersonalDrag !== isPersonalTarget) {
          dlog.error('개인 문서와 공유 문서 간 이동은 불가능합니다.');
          return;
        }
        
        // 해당 카테고리의 문서들만 가져오기
        const categoryDocuments = isPersonalDrag ? personalDocuments : sharedDocuments;
        const oldIndex = categoryDocuments.findIndex(doc => doc.id === active.id);
        const newIndex = categoryDocuments.findIndex(doc => doc.id === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(categoryDocuments, oldIndex, newIndex);
          const documentIds = newOrder.map(doc => doc.id);
          
          // DocumentContext의 updateDocumentOrder 사용
          await updateDocumentOrder(documentIds);
        }
      } catch (err) {
        console.error('문서 순서 변경 실패:', err);
        handleError(err, {
          customMessage: '문서 순서 변경에 실패했습니다.',
          showToast: true
        });
      }
    }
  };

  useEffect(() => {
    if (currentWorkspace) {
      fetchDocuments();
    }
  }, [currentWorkspace, fetchDocuments]);

  // 공유/개인 문서 분류 (루트 후보: 부모가 없거나, 부모에 접근 불가한 문서 포함)
  // 백엔드에서 접근 가능한 문서만 오므로, 부모 미접근 자식 문서는 최상위로 승격해 표시
  const { sharedDocuments, personalDocuments } = useMemo(() => {
    dlog.info('문서 분류 및 정렬 시작:', documents.length, '개 문서');
    const accessibleIds = new Set(documents.map(d => d.id));
    const isRootCandidate = (doc) => (doc.parentId == null) || !accessibleIds.has(doc.parentId);

    // 디버깅을 위한 로그 추가
    dlog.info('문서 데이터 확인:', documents.map(doc => ({ 
      id: doc.id, 
      title: doc.title, 
      isShared: doc.isShared, 
      shared: doc.shared, // Jackson 직렬화로 인해 실제로는 shared 필드로 전달됨
      userId: doc.userId,
      currentUserId: user.id,
      rawData: doc // 전체 데이터 확인
    })));

    const shared = documents.filter(doc =>
      isRootCandidate(doc) && doc.shared // Jackson 직렬화로 인해 shared 필드 사용
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
      isRootCandidate(doc) && !doc.shared // Jackson 직렬화로 인해 shared 필드 사용
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
      // 깜빡임 방지를 위해 silent 옵션 사용
      const newDocument = await createDocument({
        title: '',
        content: '',
        parentId: null,
        viewType: 'PAGE',
      }, { silent: true });
      
      // 새 문서 생성 후 스크롤을 맨 아래로 이동
      scrollToBottom();
      
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
      <div className="px-4 py-2 text-center text-gray-500">
        워크스페이스를 선택해주세요.
      </div>
    );
  }

  if (documentsLoading) {
    return <div className="px-4 py-2">로딩 중...</div>;
  }

  if (error) {
    return <div className="px-4 py-2 text-red-500">에러: {error}</div>;
  }

  return (
    <div ref={scrollContainerRef} className="overflow-y-auto flex-1">
      <div className="px-4 py-2 space-y-8">
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
            {currentWorkspace.ownerId === user.id && (
              <Button onClick={handleCreateDocument} size="sm">
                <PlusIcon className="mr-1 w-4 h-4" /> 새 문서
              </Button>
            )}
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