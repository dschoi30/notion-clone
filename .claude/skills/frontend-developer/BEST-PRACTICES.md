# Frontend Development Best Practices

Notion Clone 프로젝트의 프론트엔드 개발 베스트 프랙티스입니다.

## React 컴포넌트 작성

### 1. 함수형 컴포넌트 사용
```javascript
// ✅ Good
export function DocumentTitle({ title, onEdit }) {
  return <h1 onClick={onEdit}>{title}</h1>;
}

// ❌ Bad - 클래스형 컴포넌트는 사용하지 않음
class DocumentTitle extends React.Component {
  render() {
    return <h1>{this.props.title}</h1>;
  }
}
```

### 2. Props 검증 및 기본값
```javascript
// ✅ Good - 명확한 props와 기본값
export function Button({
  children,
  variant = 'default',
  size = 'md',
  disabled = false,
  onClick
}) {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### 3. 커스텀 훅으로 로직 캡슐화 (React Query 사용)
```javascript
// ✅ Good - React Query를 사용한 데이터 페칭
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { createLogger } from '@/lib/logger';
import { useEffect } from 'react';

const log = createLogger('useDocumentQuery');

export function useDocumentQuery(documentId) {
  const { handleError } = useErrorHandler();

  const {
    data: document,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => api.getDocument(documentId),
    enabled: !!documentId,
    staleTime: 1000 * 60 * 2, // 2분
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (error) {
      log.error('문서 조회 실패', error);
      handleError(error, {
        customMessage: '문서를 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [error, handleError]);

  return { document, loading, error, refetch };
}

// 컴포넌트에서 사용
function DocumentView({ documentId }) {
  const { document, loading, error } = useDocumentQuery(documentId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{document.title}</div>;
}
```

### 4. 종속성 배열 올바르게 사용
```javascript
// ✅ Good
useEffect(() => {
  const timer = setTimeout(() => {
    setSearchResults([]);
  }, 500);

  return () => clearTimeout(timer);
}, [searchQuery]); // 올바른 의존성

// ❌ Bad - 의존성 누락
useEffect(() => {
  api.search(searchQuery); // searchQuery를 사용하지만 의존성 배열에 없음
}, []);
```

## 상태 관리

### 1. Context로 글로벌 상태 관리 (React Query 통합)
```javascript
// ✅ Good - Context + React Query 패턴
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { createLogger } from '@/lib/logger';
import { useEffect } from 'react';

const log = createLogger('WorkspaceContext');
const WorkspaceContext = createContext();

export function WorkspaceProvider({ children }) {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const [currentWorkspace, setCurrentWorkspace] = useState(null);

  // React Query로 워크스페이스 목록 조회
  const {
    data: workspaces = [],
    isLoading: loading,
    error: workspacesError,
    refetch: refetchWorkspaces,
  } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceApi.getAccessibleWorkspaces(),
    staleTime: 1000 * 60 * 5, // 5분
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (workspacesError) {
      log.error('워크스페이스 목록 조회 실패', workspacesError);
      handleError(workspacesError, {
        customMessage: '워크스페이스 목록을 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [workspacesError, handleError]);

  // 워크스페이스 생성 mutation
  const createMutation = useMutation({
    mutationFn: (workspaceData) => workspaceApi.createWorkspace(workspaceData),
    onSuccess: (newWorkspace) => {
      queryClient.setQueryData(['workspaces'], (old = []) => [...old, newWorkspace]);
    },
    onError: (e) => {
      log.error('워크스페이스 생성 실패', e);
      handleError(e, {
        customMessage: '워크스페이스 생성에 실패했습니다.',
        showToast: true
      });
    },
  });

  return (
    <WorkspaceContext.Provider value={{ 
      workspaces, 
      currentWorkspace, 
      loading, 
      createWorkspace: createMutation.mutateAsync,
      refetchWorkspaces 
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
```

### 2. 로컬 상태는 간단하게 유지
```javascript
// ✅ Good - 로컬 상태는 컴포넌트 내에서만
function SearchInput() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      <button onClick={() => setIsOpen(!isOpen)}>Options</button>
    </div>
  );
}
```

## Tailwind CSS 스타일링

### 1. 클래스 이름 구조화
```javascript
// ✅ Good - 명확한 구조
<div className="flex items-center justify-between gap-4 p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-lg font-semibold text-gray-900">Title</h2>
  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
    Action
  </button>
</div>

// ❌ Bad - 무질서한 클래스
<div className="flex p-4 bg-white rounded shadow">
```

### 2. 반응형 디자인
```javascript
// ✅ Good - 모바일 우선 접근
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <Card key={item.id} item={item} />
  ))}
</div>
```

### 3. 다크모드 지원
```javascript
// ✅ Good - 다크모드 클래스 사용
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
    Title
  </h1>
</div>
```

## API 통신 (React Query 사용)

### 1. React Query를 사용한 데이터 페칭
```javascript
// ✅ Good - React Query로 데이터 조회
import { useQuery } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { createLogger } from '@/lib/logger';
import { useEffect } from 'react';

const log = createLogger('DocumentList');

function DocumentList({ workspaceId }) {
  const { handleError } = useErrorHandler();

  const {
    data: documents = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['documents', workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/documents`).then(res => res.data),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 2, // 2분
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (error) {
      log.error('문서 목록 조회 실패', error);
      handleError(error, {
        customMessage: '문서 목록을 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [error, handleError]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error.message} />;

  return <div>{documents.map(doc => <DocumentCard key={doc.id} doc={doc} />)}</div>;
}
```

### 2. Mutation을 사용한 데이터 변경
```javascript
// ✅ Good - React Query Mutation 사용
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { createLogger } from '@/lib/logger';

const log = createLogger('DocumentForm');

function DocumentForm({ workspaceId }) {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  const createMutation = useMutation({
    mutationFn: (documentData) => 
      api.post(`/workspaces/${workspaceId}/documents`, documentData).then(res => res.data),
    onSuccess: (newDocument) => {
      // 캐시 무효화하여 자동 리페칭
      queryClient.invalidateQueries({ queryKey: ['documents', workspaceId] });
      // 또는 낙관적 업데이트
      queryClient.setQueryData(['documents', workspaceId], (old = []) => [...old, newDocument]);
    },
    onError: (e) => {
      log.error('문서 생성 실패', e);
      handleError(e, {
        customMessage: '문서 생성에 실패했습니다.',
        showToast: true
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({ title: 'New Document' });
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? '생성 중...' : '생성'}
      </button>
    </form>
  );
}
```

### 3. 무한 스크롤 (useInfiniteQuery)
```javascript
// ✅ Good - 무한 스크롤 페이지네이션
import { useInfiniteQuery } from '@tanstack/react-query';

function DocumentList({ workspaceId }) {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['documents', workspaceId],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await api.get(`/workspaces/${workspaceId}/documents`, {
        params: { page: pageParam, size: 20 }
      });
      return {
        content: response.data.content,
        page: response.data.number,
        totalPages: response.data.totalPages,
        hasMore: !response.data.last,
      };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 0,
  });

  const documents = useMemo(() => 
    data?.pages.flatMap(page => page.content) || [], 
    [data]
  );

  return (
    <div>
      {documents.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? '로딩 중...' : '더 보기'}
        </button>
      )}
    </div>
  );
}
```

### 4. Optimistic Updates
```javascript
// ✅ Good - 낙관적 업데이트로 즉시 UI 반영
const updateMutation = useMutation({
  mutationFn: ({ id, data }) => api.put(`/documents/${id}`, data),
  onMutate: async ({ id, data }) => {
    // 진행 중인 쿼리 취소
    await queryClient.cancelQueries({ queryKey: ['documents'] });
    
    // 이전 데이터 백업
    const previous = queryClient.getQueryData(['documents']);
    
    // 낙관적 업데이트
    queryClient.setQueryData(['documents'], (old = []) =>
      old.map(doc => doc.id === id ? { ...doc, ...data } : doc)
    );
    
    return { previous };
  },
  onError: (err, variables, context) => {
    // 에러 시 이전 데이터로 복구
    if (context?.previous) {
      queryClient.setQueryData(['documents'], context.previous);
    }
  },
  onSettled: () => {
    // 최종적으로 서버 데이터와 동기화
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  },
});
```

## 성능 최적화

### 1. useCallback 사용
```javascript
// ✅ Good - 콜백 메모이제이션
function DocumentList() {
  const handleEdit = useCallback((documentId) => {
    navigate(`/documents/${documentId}`);
  }, [navigate]);

  return (
    <div>
      {documents.map(doc => (
        <DocumentItem key={doc.id} doc={doc} onEdit={handleEdit} />
      ))}
    </div>
  );
}
```

### 2. useMemo 사용
```javascript
// ✅ Good - 비용이 많이 드는 계산 메모이제이션
function DocumentList({ documents, filter }) {
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc =>
      doc.title.includes(filter) || doc.content.includes(filter)
    );
  }, [documents, filter]);

  return <div>{filteredDocuments.map(doc => <Item key={doc.id} doc={doc} />)}</div>;
}
```

### 3. 리스트 아이템 메모이제이션
```javascript
// ✅ Good - React.memo로 불필요한 재렌더링 방지
const DocumentItem = React.memo(({ doc, onEdit }) => {
  return (
    <div className="p-4 border rounded" onClick={() => onEdit(doc.id)}>
      {doc.title}
    </div>
  );
});
```

## 접근성(A11y)

### 1. 시맨틱 HTML
```javascript
// ✅ Good - 시맨틱 HTML 사용
<section>
  <h1>Documents</h1>
  <nav>
    <ul>
      <li><a href="/documents">All</a></li>
      <li><a href="/documents/shared">Shared</a></li>
    </ul>
  </nav>
  <article>
    {/* Document content */}
  </article>
</section>

// ❌ Bad - div로 모든 것 감싸기
<div>
  <div>Documents</div>
  <div>
    <div>
      <div><div>All</div></div>
    </div>
  </div>
</div>
```

### 2. ARIA 속성
```javascript
// ✅ Good - ARIA 속성 사용
<button
  aria-label="Close dialog"
  aria-pressed={isPressed}
  onClick={onClose}
>
  ✕
</button>

<input
  type="text"
  placeholder="Search documents"
  aria-describedby="search-hint"
/>
<small id="search-hint">Search by title or content</small>
```

### 3. 키보드 네비게이션
```javascript
// ✅ Good - 엔터/이스케이프 키 처리
function SearchInput({ onSearch, onCancel }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch(e.target.value);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return <input type="text" onKeyDown={handleKeyDown} />;
}
```

## 파일 구조

### 1. 컴포넌트 폴더 구조
```
components/
├── documents/
│   ├── DocumentCard.jsx
│   ├── DocumentList.jsx
│   ├── DocumentView.jsx
│   └── __tests__/
│       ├── DocumentCard.test.jsx
│       └── DocumentList.test.jsx
├── editor/
│   ├── RichTextEditor.jsx
│   └── toolbar/
└── ui/
    ├── Button.jsx
    ├── Modal.jsx
    └── Input.jsx
```

### 2. 한 파일에 한 컴포넌트
```
// ✅ Good
DocumentCard.jsx → export function DocumentCard() { ... }

// ❌ Bad - 여러 컴포넌트가 한 파일에
DocumentComponents.jsx →
  export function DocumentCard() { ... }
  export function DocumentList() { ... }
  export function DocumentView() { ... }
```

## 테스트

### 1. 컴포넌트 테스트
```javascript
// ✅ Good - React Testing Library 사용
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentCard } from './DocumentCard';

describe('DocumentCard', () => {
  it('renders document title', () => {
    render(<DocumentCard doc={{ id: 1, title: 'Test Doc' }} />);
    expect(screen.getByText('Test Doc')).toBeInTheDocument();
  });

  it('calls onEdit when clicked', () => {
    const handleEdit = jest.fn();
    render(<DocumentCard doc={{ id: 1, title: 'Test' }} onEdit={handleEdit} />);
    fireEvent.click(screen.getByText('Test'));
    expect(handleEdit).toHaveBeenCalled();
  });
});
```

## 디버깅 팁

### 1. React DevTools
- Props 확인
- State 변경 추적
- 컴포넌트 렌더링 성능 분석

### 2. 콘솔 로깅
```javascript
// ✅ Good - 개발 중에만 로깅
if (process.env.NODE_ENV === 'development') {
  console.log('Component mounted', { documentId });
}
```

### 3. 에러 바운더리
```javascript
// ✅ Good - 에러 바운더리로 예외 처리
<ErrorBoundary fallback={<ErrorPage />}>
  <DocumentView documentId={id} />
</ErrorBoundary>
```
