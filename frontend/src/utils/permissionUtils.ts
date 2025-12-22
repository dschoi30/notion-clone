/**
 * 문서 권한 관련 유틸리티 함수
 */
import type { Document, User, Permission } from '@/types';

/**
 * 문서 소유자인지 확인
 * @param document - 문서 객체 (userId 필드 필요)
 * @param user - 사용자 객체 (id 필드 필요)
 * @returns 소유자 여부
 */
export function isDocumentOwner(document: Document | null | undefined, user: User | null | undefined): boolean {
  if (!document || !user) return false;
  return String(document.userId) === String(user.id);
}

/**
 * 사용자의 문서 권한 가져오기
 * @param document - 문서 객체 (permissions 배열 필요)
 * @param user - 사용자 객체 (id 필드 필요)
 * @returns 권한 객체 또는 null
 */
export function getUserPermission(
  document: Document | null | undefined,
  user: User | null | undefined
): Permission | null {
  if (!document || !user || !document.permissions) return null;
  return document.permissions.find(p => String(p.userId) === String(user.id)) || null;
}

/**
 * 문서에 대한 쓰기 권한이 있는지 확인
 * 소유자이거나 WRITE/OWNER 권한이 있는 경우 true
 * @param document - 문서 객체 (userId, permissions 필드 필요)
 * @param user - 사용자 객체 (id 필드 필요)
 * @returns 쓰기 권한 여부
 */
export function hasWritePermission(
  document: Document | null | undefined,
  user: User | null | undefined
): boolean {
  if (!document || !user) return false;
  
  // 소유자인지 확인
  if (isDocumentOwner(document, user)) {
    return true;
  }
  
  // 사용자 권한 확인
  const myPermission = getUserPermission(document, user);
  return myPermission?.permissionType === 'WRITE' || myPermission?.permissionType === 'OWNER';
}

/**
 * 문서에 대한 읽기 권한이 있는지 확인
 * 소유자이거나 READ/WRITE/OWNER 권한이 있는 경우 true
 * @param document - 문서 객체 (userId, permissions 필드 필요)
 * @param user - 사용자 객체 (id 필드 필요)
 * @returns 읽기 권한 여부
 */
export function hasReadPermission(
  document: Document | null | undefined,
  user: User | null | undefined
): boolean {
  if (!document || !user) return false;
  
  // 소유자인지 확인
  if (isDocumentOwner(document, user)) {
    return true;
  }
  
  // 사용자 권한 확인
  const myPermission = getUserPermission(document, user);
  return myPermission?.permissionType === 'READ' 
    || myPermission?.permissionType === 'WRITE' 
    || myPermission?.permissionType === 'OWNER';
}
