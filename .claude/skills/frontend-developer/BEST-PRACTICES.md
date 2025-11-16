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

### 3. 커스텀 훅으로 로직 캡슐화
```javascript
// ✅ Good - 비즈니스 로직을 훅으로 분리
export function useDocumentQuery(documentId) {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const data = await api.getDocument(documentId);
        setDocument(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  return { document, loading, error };
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

### 1. Context로 글로벌 상태 관리
```javascript
// ✅ Good - Context 패턴
const WorkspaceContext = createContext();

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);

  const updateWorkspace = useCallback((updates) => {
    setWorkspace(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <WorkspaceContext.Provider value={{ workspace, members, updateWorkspace }}>
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

## API 통신

### 1. 에러 처리
```javascript
// ✅ Good - 적절한 에러 처리
async function fetchDocuments(workspaceId) {
  try {
    const response = await api.get(`/workspaces/${workspaceId}/documents`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // 인증 만료 - 로그인 페이지로 리다이렉트
      window.location.href = '/login';
    }
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }
}
```

### 2. 로딩 상태 관리
```javascript
// ✅ Good - 로딩, 에러, 데이터 상태 분리
function DocumentList() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDocuments();
        setDocuments(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;

  return <div>{documents.map(doc => <DocumentCard key={doc.id} doc={doc} />)}</div>;
}
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
