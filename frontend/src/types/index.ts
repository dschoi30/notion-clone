// 사용자 관련 타입
export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  profileImageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

// 문서 관련 타입
export type ViewType = 'PAGE' | 'TABLE' | 'GALLERY';

export interface Document {
  id: number;
  title: string;
  content: string;
  viewType: ViewType;
  parentId?: number;
  workspaceId: number;
  userId: number;
  sortOrder?: number;
  isTrashed: boolean;
  isLocked: boolean;
  titleColumnWidth?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  permissions?: Permission[];
  properties?: DocumentProperty[];
  hasChildren?: boolean;
}

// 권한 관련 타입
export type PermissionType = 'READ' | 'WRITE' | 'OWNER';
export type PermissionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface Permission {
  userId: number;
  name?: string;
  email?: string;
  profileImageUrl?: string;
  permissionType: PermissionType;
  status?: PermissionStatus;
}

// 워크스페이스 관련 타입
export interface Workspace {
  id: number;
  name: string;
  iconUrl?: string;
  userId: number;
  parentId?: number;
  isTrashed: boolean;
  createdAt: string;
  updatedAt: string;
}

// 속성 관련 타입
export type PropertyType =
  | 'TEXT'
  | 'NUMBER'
  | 'TAG'
  | 'DATE'
  | 'CREATED_BY'
  | 'LAST_UPDATED_BY'
  | 'CREATED_AT'
  | 'LAST_UPDATED_AT';

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
  sortOrder?: number;
}

// 속성 값 타입 (TAG는 number[] - 태그 옵션 ID 배열)
export type PropertyValue = string | number | boolean | number[];

export interface DocumentPropertyValue {
  id: number;
  documentId: number;
  propertyId: number;
  value: PropertyValue;
}

// 알림 관련 타입
export type NotificationType = 'INVITE' | 'COMMENT' | 'MENTION' | 'SYSTEM';
export type NotificationStatus = 'UNREAD' | 'READ' | 'ACCEPTED' | 'REJECTED';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  status: NotificationStatus;
  message: string;
  payload?: string;
  createdAt: string;
  updatedAt?: string;
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

// React 컴포넌트 Props 타입 (공통)
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// 폼 관련 타입
export interface FormErrors {
  [key: string]: string | undefined;
}

// 정렬 관련 타입
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  property: string;
  order: SortOrder;
}
