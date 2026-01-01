import { useEffect, useState, useMemo, useCallback, memo, MouseEvent, CSSProperties } from 'react';
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
  DragEndEvent,
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
import type { Document } from '@/types';

// DocumentList에서 사용하는 확장 Document 타입
interface DocumentWithExtras extends Document {
  isChild?: boolean;
  shared?: boolean;
}

interface DocumentItemProps {
  document: DocumentWithExtras;
  currentDocument: Document | null;
  onSelect: (document: Document) => void;
  onDelete: (id: number) => void;
  openedIds: Set<number>;
  setOpenedIds: (updater: (prev: Set<number>) => Set<number>) => void;
  childrenMap: Record<number, Document[]>;
  setChildrenMap: (updater: (prev: Record<number, Document[]>) => Record<number, Document[]>) => void;
  fetchChildDocuments: (id: number, options?: { silent?: boolean }) => Promise<Document[]>;
  idPath: number[];
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  style?: CSSProperties;
}

// 문서 아이템 컴포넌트
const DocumentItem = memo<DocumentItemProps>(({ 
  document,
  currentDocument, 
  onSelect, 
  onDelete, 
  openedIds, 
  setOpenedIds, 
  childrenMap, 
  setChildrenMap, 
  fetchChildDocuments, 
  idPath,
  sensors,
  onDragEnd,
  style
}) => {
  const [hovered, setHovered] = useState<boolean>(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: document.id,
    animateLayoutChanges: () => true,
  });

  const itemStyle = useMemo<CSSProperties>(() => ({
    ...style,
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition || undefined,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }), [style, transform, transition, isDragging]);

  const handleToggle = useCallback(async (e: MouseEvent) => {
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
        const docs = await fetchChildDocuments(document.id, { silent: true });
        setChildrenMap(prev => ({ ...prev, [document.id]: docs }));
      }
    }
  }, [document.id, openedIds, childrenMap, setOpenedIds, setChildrenMap, fetchChildDocuments]);

  const handleSelect = useCallback(() => {
    onSelect(document);
  }, [onSelect, document]);

  const handleDelete = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    onDelete(document.id);
  }, [onDelete, document.id]);

  const Icon = document.viewType === 'TABLE' ? Table : FileText;
  
  // 자식 문서인 경우 간단한 렌더링
  if (document.isChild) {
    const isSelected = currentDocument?.id === document.id;
    return (
      <div
        className={`flex items-center ml-4 min-w-0 h-8 rounded transition-colors group`}
        style={{
          ...itemStyle,
          background: isSelected && hovered
            ? '#E8E8E6'  // 선택 + 호버: 더 진한 색상
            : isSelected 
              ? '#F0F0EF'  // 선택만: 기본 색상
              : hovered
                ? '#F0F0EF'  // 호버만: 기본 색상
                : undefined
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className="flex justify-center items-center mr-1 w-8 h-8">
          <Icon className="w-4 h-4 text-gray-400" />
        </span>
        <span
          className={`flex-1 items-center px-1 h-8 truncate whitespace-nowrap rounded cursor-pointer ${
            isSelected ? 'font-medium text-gray-900' : 'text-gray-900'
          }`}
          style={{ 
            lineHeight: '2rem', 
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
          }}
          onClick={handleSelect}
          title={document.title}
        >
          {document.title}
        </span>
      </div>
    );
  }

  // 선택 상태 확인
  const isSelected = currentDocument?.id === document.id;
  
  return (
    <div
      ref={setNodeRef}
      className={`flex items-center min-w-0 h-8 transition-colors group rounded ${document.isChild ? 'ml-4' : ''}`}
      style={{
        ...itemStyle,
        background: isSelected && hovered
          ? '#E8E8E6'  // 선택 + 호버: 더 진한 색상
          : isSelected 
            ? '#F0F0EF'  // 선택만: 기본 색상
            : hovered
              ? '#F0F0EF'  // 호버만: 기본 색상
              : undefined
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 드래그 핸들 */}
      <div
        {...attributes}
        {...listeners}
        className="flex justify-center items-center p-0 mr-1 w-8 h-8 rounded cursor-grab"
        style={{
          minWidth: 32,
          background: isSelected && hovered
            ? '#E8E8E6'  // 선택 + 호버: 더 진한 색상
            : hovered
              ? '#F0F0EF'  // 호버만: 기본 색상
              : undefined
        }}
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>
      
      {document.hasChildren ? (
        hovered ? (
          <button
            onClick={handleToggle}
            className="flex justify-center items-center p-0 mr-1 w-8 h-8 rounded"
            style={{ 
              minWidth: 32,
              background: isSelected && hovered
                ? '#E8E8E6'  // 선택 + 호버: 더 진한 색상
                : hovered
                  ? '#F0F0EF'  // 호버만: 기본 색상
                  : undefined
            }}
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
        className={`flex-1 items-center px-1 h-8 truncate whitespace-nowrap rounded cursor-pointer ${
          isSelected ? 'font-medium text-gray-900' : 'text-gray-900'
        }`}
        style={{ 
          lineHeight: '2rem', 
          display: 'flex',
          alignItems: 'center',
          minWidth: 0,
        }}
        onClick={handleSelect}
        title={document.title}
      >
        {document.title}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        className={`hidden justify-center items-center p-0 w-8 h-8 rounded ${
          hovered ? 'flex' : 'group-hover:flex'
        }`}
        style={{ 
          minWidth: 32,
          background: isSelected && hovered
            ? '#E8E8E6'  // 선택 + 호버: 더 진한 색상
            : hovered
              ? '#F0F0EF'  // 호버만: 기본 색상
              : undefined
        }}
      >
        <TrashIcon className="w-4 h-4 text-red-500" />
      </Button>
    </div>
  );
});

DocumentItem.displayName = 'DocumentItem';

interface DocumentSectionProps {
  title: string;
  documents: Document[];
  currentDocument: Document | null;
  onSelect: (document: Document) => void;
  onDelete: (id: number) => void;
  openedIds: Set<number>;
  setOpenedIds: (updater: (prev: Set<number>) => Set<number>) => void;
  childrenMap: Record<number, Document[]>;
  setChildrenMap: (updater: (prev: Record<number, Document[]>) => Record<number, Document[]>) => void;
  fetchChildDocuments: (id: number, options?: { silent?: boolean }) => Promise<Document[]>;
  idPath: number[];
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  showCreateButton?: boolean;
  onCreateDocument?: () => void;
}

// 문서 섹션 컴포넌트
const DocumentSection = memo<DocumentSectionProps>(({ 
  title, 
  documents, 
  currentDocument, 
  onSelect, 
  onDelete, 
  openedIds, 
  setOpenedIds, 
  childrenMap, 
  setChildrenMap, 
  fetchChildDocuments, 
  idPath,
  sensors,
  onDragEnd,
  showCreateButton = false,
  onCreateDocument
}) => {
  // 자식 문서를 포함한 전체 문서 목록 생성
  const allVisibleDocuments = useMemo<DocumentWithExtras[]>(() => {
    const result: DocumentWithExtras[] = [];
    documents.forEach(doc => {
      result.push(doc);
      // 자식 문서가 열려있으면 추가
      if (openedIds.has(doc.id) && childrenMap[doc.id]) {
        childrenMap[doc.id].forEach(child => {
          result.push({ ...child, isChild: true, parentId: doc.id });
        });
      }
    });
    return result;
  }, [documents, openedIds, childrenMap]);

  // 드래그 가능한 문서 ID 목록
  const sortableItems = useMemo(() => {
    return documents.map(doc => doc.id);
  }, [documents]);


  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {showCreateButton && onCreateDocument && (
          <Button onClick={onCreateDocument} size="sm">
            <PlusIcon className="mr-1 w-4 h-4" /> 새 문서
          </Button>
        )}
      </div>
      {documents.length === 0 ? (
        <div className="text-center text-gray-500">
          {title === '공유 문서' ? '공유 문서가 없습니다.' : '개인 문서가 없습니다.'}
        </div>
      ) : (
        <div className="relative">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={sortableItems}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {allVisibleDocuments.map((document) => (
                  <DocumentItem
                    key={document.isChild ? `${document.parentId}-${document.id}` : document.id}
                    document={document}
                    currentDocument={currentDocument}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    openedIds={openedIds}
                    setOpenedIds={setOpenedIds}
                    childrenMap={childrenMap}
                    setChildrenMap={setChildrenMap}
                    fetchChildDocuments={fetchChildDocuments}
                    idPath={idPath}
                    sensors={sensors}
                    onDragEnd={onDragEnd}
                    style={{ 
                      height: 32,
                      paddingLeft: document.isChild ? 20 : 0
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
});

DocumentSection.displayName = 'DocumentSection';

// 메인 DocumentList 컴포넌트
const DocumentList = memo(() => {
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
  
  
  // dnd-kit 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // 공유/개인 문서 분류
  const { sharedDocuments, personalDocuments } = useMemo(() => {
    if (documents.length === 0) {
      return { sharedDocuments: [], personalDocuments: [] };
    }
    
    const accessibleIds = new Set(documents.map(d => d.id));
    const isRootCandidate = (doc: Document) => (doc.parentId == null) || !accessibleIds.has(doc.parentId);

    const shared: DocumentWithExtras[] = [];
    const personal: DocumentWithExtras[] = [];
    
    documents.forEach(doc => {
      if (isRootCandidate(doc)) {
        const docWithExtras = doc as DocumentWithExtras;
        // shared 속성은 permissions를 기반으로 판단
        const hasOtherUsers = doc.permissions && doc.permissions.some(p => p.userId !== user.id);
        if (hasOtherUsers) {
          shared.push({ ...docWithExtras, shared: true });
        } else {
          personal.push({ ...docWithExtras, shared: false });
        }
      }
    });
    
    const sortByOrder = (a: Document, b: Document) => {
      const sortOrderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const sortOrderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      return sortOrderA - sortOrderB;
    };
    
    shared.sort(sortByOrder);
    personal.sort(sortByOrder);
    
    return { sharedDocuments: shared, personalDocuments: personal };
  }, [documents, user.id]);

  // 드래그 앤 드롭 핸들러
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id !== over.id) {
      try {
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
  }, [documents, user.id, personalDocuments, sharedDocuments, updateDocumentOrder, handleError, dlog]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchDocuments();
    }
  }, [currentWorkspace, fetchDocuments]);


  const [openedIds, setOpenedIds] = useState<Set<number>>(new Set());
  const [childrenMap, setChildrenMap] = useState<Record<number, Document[]>>({});

  // 선택된 문서에서 루트까지 id 경로 계산
  const idPath = useMemo<number[]>(() => {
    if (!currentDocument) {
      return [];
    }
    const path: number[] = [];
    let doc: Document | undefined = currentDocument;
    while (doc) {
      path.unshift(doc.id);
      doc = documents.find(d => d.id === doc!.parentId);
    }
    return path;
  }, [currentDocument, documents]);

  // 문서 클릭 시 라우팅
  const handleSelectDocument = useCallback((document: Document) => {
    navigate(`/${document.id}-${slugify(document.title || 'untitled')}`);
    selectDocument(document);
  }, [navigate, selectDocument]);

  // 새 문서 생성
  const handleCreateDocument = useCallback(async () => {
    try {
      const newDocument = await createDocument({
        title: '',
        content: '',
        parentId: null,
        viewType: 'PAGE',
      }, { silent: true });
      
      handleSelectDocument(newDocument);
    } catch (err) {
      console.error('문서 생성 실패:', err);
    }
  }, [createDocument, handleSelectDocument]);

  const handleDeleteDocument = useCallback(async (id: number) => {
    try {
      await deleteDocument(id);
    } catch (err) {
      console.error('문서 삭제 실패:', err);
    }
  }, [deleteDocument]);

  // 전체 높이 계산 - 통합 스크롤용
  const totalHeight = useMemo(() => {
    const sectionHeight = 60; // 섹션 헤더 높이
    const padding = 32; // 전체 패딩
    const itemHeight = 32; // 문서 아이템 높이
    
    // 공유 문서 섹션 높이
    const sharedSectionHeight = sharedDocuments.length > 0 ? 
      sectionHeight + (sharedDocuments.length * itemHeight) : 0;
    
    // 개인 문서 섹션 높이  
    const personalSectionHeight = personalDocuments.length > 0 ?
      sectionHeight + (personalDocuments.length * itemHeight) : 0;
    
    // 전체 높이 계산
    const calculatedHeight = sharedSectionHeight + personalSectionHeight + padding;
    
    // 최대 높이 제한 (화면 높이의 80% 정도)
    const maxHeight = Math.min(window.innerHeight * 0.8, 600);
    
    return Math.min(calculatedHeight, maxHeight);
  }, [sharedDocuments.length, personalDocuments.length]);

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
    <div 
      className="flex-1"
      style={{ 
        height: `${totalHeight}px`,
        overflowY: 'auto' // 통합 스크롤 활성화
      }}
    >
      <div className="px-4 space-y-8">
        {/* 공유 문서 섹션 */}
        <DocumentSection
          title="공유 문서"
          documents={sharedDocuments}
          currentDocument={currentDocument}
          onSelect={handleSelectDocument}
          onDelete={handleDeleteDocument}
          openedIds={openedIds}
          setOpenedIds={setOpenedIds}
          childrenMap={childrenMap}
          setChildrenMap={setChildrenMap}
          fetchChildDocuments={fetchChildDocuments}
          idPath={idPath}
          sensors={sensors}
          onDragEnd={handleDragEnd}
        />
        
        {/* 개인 문서 섹션 */}
        <DocumentSection
          title="개인 문서"
          documents={personalDocuments}
          currentDocument={currentDocument}
          onSelect={handleSelectDocument}
          onDelete={handleDeleteDocument}
          openedIds={openedIds}
          setOpenedIds={setOpenedIds}
          childrenMap={childrenMap}
          setChildrenMap={setChildrenMap}
          fetchChildDocuments={fetchChildDocuments}
          idPath={idPath}
          sensors={sensors}
          onDragEnd={handleDragEnd}
          showCreateButton={currentWorkspace?.ownerId === user?.id}
          onCreateDocument={handleCreateDocument}
        />
      </div>
    </div>
  );
});

DocumentList.displayName = 'DocumentList';

export default DocumentList;

