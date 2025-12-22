# TypeScript 점진적 도입 가이드

## 목차
1. [개요](#개요)
2. [도입 전략](#도입-전략)
3. [단계별 실행 계획](#단계별-실행-계획)
4. [TypeScript 기본 개념](#typescript-기본-개념)
5. [마이그레이션 예제](#마이그레이션-예제)
6. [주의사항 및 베스트 프랙티스](#주의사항-및-베스트-프랙티스)
7. [문제 해결 가이드](#문제-해결-가이드)

---

## 개요

### 목적
- JavaScript 프로젝트를 TypeScript로 점진적으로 마이그레이션
- 타입 안정성 확보로 런타임 에러 감소
- 개발 생산성 향상 및 코드 품질 개선
- 기존 코드와의 호환성 유지

### 현재 상태
- **프로젝트**: Vite + React
- **언어**: JavaScript (55개 .js 파일, 82개 .jsx 파일)
- **의존성**: 일부 @types 패키지 설치됨 (실제 TypeScript 미사용)

### 목표
- 6개월 내 모든 핵심 파일을 TypeScript로 전환
- 새로 작성하는 모든 파일은 TypeScript로 작성
- 기존 JavaScript 파일과 TypeScript 파일 공존 허용

---

## 도입 전략

### 1. 점진적 마이그레이션 (Gradual Migration)
- 기존 JS/JSX 파일과 TS/TSX 파일 공존 허용
- 새 파일부터 TypeScript로 작성
- 기존 파일은 우선순위에 따라 점진적으로 변환

### 2. 타입 엄격도 조절
- 초기: 느슨한 타입 체크 (allowJs: true, noImplicitAny: false)
- 중기: 중간 수준 (noImplicitAny: true)
- 후기: 엄격한 타입 체크 (strict: true)

### 3. 우선순위 기준
1. **높은 우선순위**: 자주 사용되는 유틸리티, API 서비스, 공통 컴포넌트
2. **중간 우선순위**: 비즈니스 로직, 훅, 컨텍스트
3. **낮은 우선순위**: UI 컴포넌트, 스타일 파일

---

## 단계별 실행 계획

### Phase 1: TypeScript 환경 설정

#### 1.1 TypeScript 및 필수 패키지 설치
```bash
cd frontend
pnpm add -D typescript @types/react @types/react-dom @types/node
```

#### 1.2 tsconfig.json 생성
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": false,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* 점진적 마이그레이션을 위한 설정 */
    "allowJs": true,
    "checkJs": false,
    "noImplicitAny": false,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,

    /* 경로 별칭 */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### 1.3 vite.config.js → vite.config.ts 변환
- Vite 설정 파일을 TypeScript로 변환
- 타입 안정성 확보

#### 1.4 빌드 및 개발 서버 테스트
```bash
pnpm dev
pnpm build
```

---

### Phase 2: 타입 정의 파일 생성

#### 2.1 공통 타입 정의 파일 생성
**파일**: `src/types/index.ts`

```typescript
// 사용자 관련 타입
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

// 문서 관련 타입
export type ViewType = 'PAGE' | 'TABLE' | 'GALLERY';
export type PropertyType = 'TEXT' | 'NUMBER' | 'DATE' | 'CHECKBOX' | 'TAG' | 'SELECT';

export interface Document {
  id: number;
  title: string;
  content: string;
  viewType: ViewType;
  parentId?: number;
  workspaceId: number;
  userId: number;
  sortOrder: number;
  isTrashed: boolean;
  isLocked: boolean;
  titleWidth?: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: number;
  permissions?: Permission[];
}

export interface Permission {
  id: number;
  userId: number;
  documentId: number;
  permissionType: 'READ' | 'WRITE' | 'OWNER';
  permissionStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  userName?: string;
  userEmail?: string;
  profileImageUrl?: string;
}

// 워크스페이스 관련 타입
export interface Workspace {
  id: number;
  name: string;
  description?: string;
  userId: number;
  parentId?: number;
  createdAt: string;
  updatedAt: string;
}

// 속성 관련 타입
export interface DocumentProperty {
  id: number;
  documentId: number;
  name: string;
  type: PropertyType;
  sortOrder: number;
  width?: number;
  tagOptions?: TagOption[];
}

export interface TagOption {
  id: number;
  propertyId: number;
  label: string;
  color?: string;
}

export interface DocumentPropertyValue {
  id: number;
  documentId: number;
  propertyId: number;
  value: string | number | boolean | number[]; // TAG는 number[]
}

// 알림 관련 타입
export type NotificationType = 'INVITE' | 'COMMENT' | 'MENTION' | 'SYSTEM';
export type NotificationStatus = 'UNREAD' | 'READ' | 'ACCEPTED' | 'REJECTED';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  payload?: string;
  createdAt: string;
}

// API 응답 타입
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// 에러 타입
export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}
```

#### 2.2 백엔드 API 응답 타입 정의
- 백엔드 DTO와 일치하는 타입 정의
- API 서비스 파일에서 사용

#### 2.3 React 컴포넌트 Props 타입 정의
- 공통 컴포넌트의 Props 타입 정의
- 재사용 가능한 타입 인터페이스 생성

---

### Phase 3: 유틸리티 및 서비스 파일 마이그레이션

#### 3.1 우선순위 파일 목록
1. `src/lib/utils.js` → `utils.ts`
2. `src/lib/logger.js` → `logger.ts`
3. `src/lib/errorUtils.js` → `errorUtils.ts`
4. `src/services/api.js` → `api.ts`
5. `src/services/auth.js` → `auth.ts`
6. `src/services/documentApi.js` → `documentApi.ts`
7. `src/services/workspaceApi.js` → `workspaceApi.ts`
8. `src/services/userApi.js` → `userApi.ts`
9. `src/services/notificationApi.js` → `notificationApi.ts`
10. `src/services/trashApi.js` → `trashApi.ts`

#### 3.2 마이그레이션 예제: utils.js
**변환 전** (`utils.js`):
```javascript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

**변환 후** (`utils.ts`):
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

#### 3.3 API 서비스 마이그레이션 예제
**변환 전** (`documentApi.js`):
```javascript
import api from './api';

export const getDocuments = async (workspaceId) => {
  const response = await api.get(`/workspaces/${workspaceId}/documents`);
  return response.data;
};
```

**변환 후** (`documentApi.ts`):
```typescript
import api from './api';
import type { Document, PaginatedResponse } from '@/types';

export const getDocuments = async (workspaceId: number): Promise<Document[]> => {
  const response = await api.get<Document[]>(`/workspaces/${workspaceId}/documents`);
  return response.data;
};
```

---

### Phase 4: 훅 및 컨텍스트 마이그레이션

#### 4.1 우선순위 파일 목록
1. `src/hooks/useToast.js` → `useToast.ts`
2. `src/hooks/useDebounce.js` → `useDebounce.ts`
3. `src/hooks/useThrottle.js` → `useThrottle.ts`
4. `src/hooks/useErrorHandler.js` → `useErrorHandler.ts`
5. `src/contexts/AuthContext.jsx` → `AuthContext.tsx`
6. `src/contexts/DocumentContext.jsx` → `DocumentContext.tsx`
7. `src/contexts/WorkspaceContext.jsx` → `WorkspaceContext.tsx`
8. `src/contexts/NotificationContext.jsx` → `NotificationContext.tsx`

#### 4.2 커스텀 훅 마이그레이션 예제
**변환 전** (`useDebounce.js`):
```javascript
import { useState, useEffect } from 'react';

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

**변환 후** (`useDebounce.ts`):
```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

#### 4.3 Context 마이그레이션 예제
**변환 전** (`AuthContext.jsx`):
```javascript
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

**변환 후** (`AuthContext.tsx`):
```typescript
import { createContext, useContext, useState, ReactNode } from 'react';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

### Phase 5: 컴포넌트 마이그레이션

#### 5.1 우선순위 파일 목록
1. **UI 컴포넌트** (낮은 복잡도)
   - `src/components/ui/button.jsx` → `button.tsx`
   - `src/components/ui/input.jsx` → `input.tsx`
   - `src/components/ui/card.jsx` → `card.tsx`
   - `src/components/ui/badge.jsx` → `badge.tsx`

2. **공통 컴포넌트** (중간 복잡도)
   - `src/components/documents/shared/UserBadge.jsx` → `UserBadge.tsx`
   - `src/components/ui/PermissionGate.jsx` → `PermissionGate.tsx`
   - `src/components/ui/PermissionButton.jsx` → `PermissionButton.tsx`

3. **비즈니스 컴포넌트** (높은 복잡도)
   - `src/components/documents/DocumentList.jsx` → `DocumentList.tsx`
   - `src/components/documents/DocumentEditor.jsx` → `DocumentEditor.tsx`
   - `src/components/documents/DocumentTableView.jsx` → `DocumentTableView.tsx`

#### 5.2 컴포넌트 마이그레이션 예제
**변환 전** (`UserBadge.jsx`):
```javascript
export function UserBadge({ user, showName = true }) {
  return (
    <div className="flex items-center gap-2">
      {user.profileImageUrl ? (
        <img src={user.profileImageUrl} alt={user.name} />
      ) : (
        <div>{user.name?.[0]}</div>
      )}
      {showName && <span>{user.name || user.email}</span>}
    </div>
  );
}
```

**변환 후** (`UserBadge.tsx`):
```typescript
import type { User } from '@/types';

interface UserBadgeProps {
  user: User;
  showName?: boolean;
}

export function UserBadge({ user, showName = true }: UserBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      {user.profileImageUrl ? (
        <img src={user.profileImageUrl} alt={user.name} />
      ) : (
        <div>{user.name?.[0]}</div>
      )}
      {showName && <span>{user.name || user.email}</span>}
    </div>
  );
}
```

---

### Phase 6: 타입 엄격도 강화

#### 6.1 tsconfig.json 엄격도 단계적 증가

**단계 1**: `noImplicitAny` 활성화
```json
{
  "compilerOptions": {
    "noImplicitAny": true
  }
}
```

**단계 2**: `strict` 모드 활성화
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

#### 6.2 타입 에러 수정
- `any` 타입 제거
- `null`/`undefined` 체크 추가
- 옵셔널 체이닝 활용

---

## TypeScript 기본 개념

### 1. 기본 타입
```typescript
// 원시 타입
let name: string = "John";
let age: number = 30;
let isActive: boolean = true;
let data: null = null;
let value: undefined = undefined;

// 배열
let numbers: number[] = [1, 2, 3];
let names: Array<string> = ["John", "Jane"];

// 객체
interface User {
  id: number;
  name: string;
  email?: string; // 옵셔널
}

// 유니온 타입
let id: string | number = "123";
id = 456; // OK

// 리터럴 타입
type Status = "pending" | "approved" | "rejected";
let status: Status = "pending";
```

### 2. 함수 타입
```typescript
// 함수 선언
function greet(name: string): string {
  return `Hello, ${name}`;
}

// 화살표 함수
const add = (a: number, b: number): number => {
  return a + b;
};

// 옵셔널 파라미터
function createUser(name: string, email?: string): User {
  return { id: 1, name, email };
}

// 기본값 파라미터
function multiply(a: number, b: number = 1): number {
  return a * b;
}

// 제네릭 함수
function identity<T>(arg: T): T {
  return arg;
}
```

### 3. React 컴포넌트 타입
```typescript
import { FC, ReactNode } from 'react';

// 함수 컴포넌트
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const Button: FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
};

// 또는 직접 타입 지정
function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
```

### 4. 훅 타입
```typescript
import { useState, useEffect } from 'react';

// useState
const [user, setUser] = useState<User | null>(null);

// useEffect
useEffect(() => {
  // effect
  return () => {
    // cleanup
  };
}, [dependencies]);

// 커스텀 훅
function useDocument(id: number) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchDocument(id).then(setDocument).finally(() => setLoading(false));
  }, [id]);

  return { document, loading };
}
```

### 5. 이벤트 핸들러 타입
```typescript
// 마우스 이벤트
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
};

// 폼 이벤트
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};

// 입력 이벤트
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
};
```

---

## 마이그레이션 예제

### 예제 1: 간단한 유틸리티 함수
**변환 전** (`permissionUtils.js`):
```javascript
export function isDocumentOwner(document, user) {
  return String(document.userId) === String(user.id);
}

export function hasWritePermission(document, user) {
  if (isDocumentOwner(document, user)) {
    return true;
  }
  
  const myPermission = document.permissions?.find(
    p => String(p.userId) === String(user.id)
  );
  
  return myPermission?.permissionType === 'WRITE' || 
         myPermission?.permissionType === 'OWNER';
}
```

**변환 후** (`permissionUtils.ts`):
```typescript
import type { Document, User } from '@/types';

export function isDocumentOwner(document: Document, user: User): boolean {
  return String(document.userId) === String(user.id);
}

export function hasWritePermission(document: Document, user: User): boolean {
  if (isDocumentOwner(document, user)) {
    return true;
  }
  
  const myPermission = document.permissions?.find(
    (p) => String(p.userId) === String(user.id)
  );
  
  return myPermission?.permissionType === 'WRITE' || 
         myPermission?.permissionType === 'OWNER';
}
```

### 예제 2: API 서비스 함수
**변환 전** (`documentApi.js`):
```javascript
import api from './api';

export const getDocument = async (documentId) => {
  const response = await api.get(`/documents/${documentId}`);
  return response.data;
};

export const createDocument = async (workspaceId, data) => {
  const response = await api.post(`/workspaces/${workspaceId}/documents`, data);
  return response.data;
};

export const updateDocument = async (documentId, data) => {
  const response = await api.put(`/documents/${documentId}`, data);
  return response.data;
};
```

**변환 후** (`documentApi.ts`):
```typescript
import api from './api';
import type { Document } from '@/types';

interface CreateDocumentRequest {
  title: string;
  content?: string;
  viewType?: 'PAGE' | 'TABLE' | 'GALLERY';
  parentId?: number;
}

interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  viewType?: 'PAGE' | 'TABLE' | 'GALLERY';
  isLocked?: boolean;
  titleWidth?: number;
}

export const getDocument = async (documentId: number): Promise<Document> => {
  const response = await api.get<Document>(`/documents/${documentId}`);
  return response.data;
};

export const createDocument = async (
  workspaceId: number,
  data: CreateDocumentRequest
): Promise<Document> => {
  const response = await api.post<Document>(
    `/workspaces/${workspaceId}/documents`,
    data
  );
  return response.data;
};

export const updateDocument = async (
  documentId: number,
  data: UpdateDocumentRequest
): Promise<Document> => {
  const response = await api.put<Document>(`/documents/${documentId}`, data);
  return response.data;
};
```

### 예제 3: React 컴포넌트
**변환 전** (`DocumentList.jsx`):
```javascript
import { useState, useEffect } from 'react';
import { useDocument } from '@/contexts/DocumentContext';

export function DocumentList() {
  const { documents, loading, error } = useDocument();
  const [expandedIds, setExpandedIds] = useState(new Set());

  const handleToggle = (id) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {documents.map((doc) => (
        <div key={doc.id}>
          <button onClick={() => handleToggle(doc.id)}>
            {doc.title}
          </button>
        </div>
      ))}
    </div>
  );
}
```

**변환 후** (`DocumentList.tsx`):
```typescript
import { useState } from 'react';
import { useDocument } from '@/contexts/DocumentContext';

export function DocumentList() {
  const { documents, loading, error } = useDocument();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const handleToggle = (id: number): void => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {documents.map((doc) => (
        <div key={doc.id}>
          <button onClick={() => handleToggle(doc.id)}>
            {doc.title}
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 주의사항 및 베스트 프랙티스

### 1. 점진적 마이그레이션 원칙
- ✅ **DO**: 한 번에 하나의 파일씩 변환
- ✅ **DO**: 변환 후 테스트 실행
- ❌ **DON'T**: 한 번에 모든 파일 변환 시도
- ❌ **DON'T**: 타입을 완벽하게 만들려고 과도한 시간 소비

### 2. 타입 정의 원칙
- ✅ **DO**: 공통 타입은 `src/types/index.ts`에 정의
- ✅ **DO**: 컴포넌트별 Props는 해당 파일에 정의
- ✅ **DO**: 복잡한 타입은 별도 파일로 분리
- ❌ **DON'T**: `any` 타입 남용 (점진적으로 제거)

### 3. 타입 추론 활용
```typescript
// ❌ 불필요한 타입 명시
const count: number = 0;

// ✅ 타입 추론 활용
const count = 0;

// ✅ 복잡한 경우에만 타입 명시
const user: User = { id: 1, name: "John" };
```

### 4. 옵셔널 체이닝과 null 병합
```typescript
// ✅ 옵셔널 체이닝
const userName = user?.name ?? "Unknown";

// ✅ null 병합 연산자
const count = items?.length ?? 0;
```

### 5. 제네릭 활용
```typescript
// ✅ 제네릭으로 재사용 가능한 타입
function getValue<T>(key: string): T | null {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : null;
}

// 사용
const user = getValue<User>("user");
```

### 6. 타입 가드 함수
```typescript
// ✅ 타입 가드로 런타임 검증
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj
  );
}

// 사용
if (isUser(data)) {
  // 이제 data는 User 타입으로 추론됨
  console.log(data.email);
}
```

---

## 문제 해결 가이드

### 문제 1: 모듈을 찾을 수 없음
**에러**: `Cannot find module '@/types'`

**해결**:
1. `tsconfig.json`의 `paths` 설정 확인
2. Vite의 `resolve.alias` 설정 확인 (`vite.config.ts`)
3. 파일 확장자 확인 (`.ts` 또는 `.tsx`)

### 문제 2: JSX를 사용할 수 없음
**에러**: `JSX element implicitly has type 'any'`

**해결**:
1. `tsconfig.json`의 `jsx` 옵션 확인 (`"jsx": "react-jsx"`)
2. React import 확인 (React 17+에서는 불필요하지만 확인)

### 문제 3: 타입이 맞지 않음
**에러**: `Type 'string' is not assignable to type 'number'`

**해결**:
1. 타입 정의 확인
2. 타입 변환 필요 시 `as` 또는 타입 가드 사용
3. 백엔드 API 응답 타입 확인

### 문제 4: 외부 라이브러리 타입 없음
**에러**: `Could not find a declaration file for module 'xxx'`

**해결**:
```bash
# 타입 정의 패키지 설치
pnpm add -D @types/xxx

# 또는 타입 선언 파일 생성
# src/types/xxx.d.ts
declare module 'xxx';
```

### 문제 5: 순환 참조
**에러**: `Circular reference detected`

**해결**:
1. 타입 정의를 별도 파일로 분리
2. `import type` 사용 (타입만 import)
```typescript
import type { User } from '@/types';
```

---

## 체크리스트

### Phase 1 완료 체크리스트
- [ ] TypeScript 및 필수 패키지 설치
- [ ] `tsconfig.json` 생성 및 설정
- [ ] `vite.config.ts` 변환
- [ ] 빌드 및 개발 서버 정상 동작 확인

### Phase 2 완료 체크리스트
- [ ] `src/types/index.ts` 생성
- [ ] 주요 도메인 타입 정의 완료
- [ ] API 응답 타입 정의 완료

### Phase 3 완료 체크리스트
- [ ] 유틸리티 파일 마이그레이션 완료
- [ ] API 서비스 파일 마이그레이션 완료
- [ ] 타입 에러 없음 확인

### Phase 4 완료 체크리스트
- [ ] 커스텀 훅 마이그레이션 완료
- [ ] Context 파일 마이그레이션 완료
- [ ] 타입 에러 없음 확인

### Phase 5 완료 체크리스트
- [ ] UI 컴포넌트 마이그레이션 완료
- [ ] 비즈니스 컴포넌트 마이그레이션 완료
- [ ] 모든 컴포넌트 타입 안정성 확인

### Phase 6 완료 체크리스트
- [ ] `strict` 모드 활성화
- [ ] 모든 `any` 타입 제거
- [ ] 타입 에러 없음 확인
- [ ] 빌드 성공 확인

---

## 참고 자료

### 공식 문서
- [TypeScript 공식 문서](https://www.typescriptlang.org/docs/)
- [React TypeScript 가이드](https://react-typescript-cheatsheet.netlify.app/)
- [Vite TypeScript 가이드](https://vitejs.dev/guide/features.html#typescript)

### 학습 자료
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### 도구
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [React TypeScript 변환 도구](https://transform.tools/javascript-to-typescript)

---

## 다음 단계

마이그레이션 완료 후:
1. 타입 안정성 모니터링
2. 코드 리뷰 시 타입 체크 강화
3. 새로운 기능은 TypeScript로만 작성
4. 점진적으로 엄격도 증가