import { describe, it, expect } from 'vitest';
import {
  isDocumentOwner,
  getUserPermission,
  hasWritePermission,
  hasReadPermission,
} from './permissionUtils';
import type { Document, User, Permission } from '@/types';

describe('permissionUtils', () => {
  const mockUser1: User = { id: 1, email: 'user1@example.com', name: 'User 1' };
  const mockUser2: User = { id: 2, email: 'user2@example.com', name: 'User 2' };
  
  const mockDocument: Document = {
    id: 1,
    title: 'Test Document',
    content: 'Test content',
    userId: 1,
    workspaceId: 1,
    permissions: [
      { id: 1, userId: 2, documentId: 1, permissionType: 'READ' },
      { id: 2, userId: 3, documentId: 1, permissionType: 'WRITE' },
    ] as Permission[],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe('isDocumentOwner', () => {
    it('소유자인 경우 true를 반환한다', () => {
      expect(isDocumentOwner(mockDocument, mockUser1)).toBe(true);
    });

    it('소유자가 아닌 경우 false를 반환한다', () => {
      expect(isDocumentOwner(mockDocument, mockUser2)).toBe(false);
    });

    it('문서가 null이면 false를 반환한다', () => {
      expect(isDocumentOwner(null, mockUser1)).toBe(false);
    });

    it('사용자가 null이면 false를 반환한다', () => {
      expect(isDocumentOwner(mockDocument, null)).toBe(false);
    });

    it('문서와 사용자가 모두 null이면 false를 반환한다', () => {
      expect(isDocumentOwner(null, null)).toBe(false);
    });

    it('문서의 userId가 문자열이어도 올바르게 비교한다', () => {
      const docWithStringId = { ...mockDocument, userId: '1' };
      expect(isDocumentOwner(docWithStringId, mockUser1)).toBe(true);
    });

    it('사용자의 id가 문자열이어도 올바르게 비교한다', () => {
      const userWithStringId = { ...mockUser1, id: '1' };
      expect(isDocumentOwner(mockDocument, userWithStringId)).toBe(true);
    });
  });

  describe('getUserPermission', () => {
    it('사용자의 권한을 찾아 반환한다', () => {
      const permission = getUserPermission(mockDocument, mockUser2);
      expect(permission).not.toBeNull();
      expect(permission?.userId).toBe(2);
      expect(permission?.permissionType).toBe('READ');
    });

    it('권한이 없는 사용자는 null을 반환한다', () => {
      const userWithoutPermission: User = { id: 999, email: 'user999@example.com', name: 'User 999' };
      expect(getUserPermission(mockDocument, userWithoutPermission)).toBeNull();
    });

    it('문서가 null이면 null을 반환한다', () => {
      expect(getUserPermission(null, mockUser1)).toBeNull();
    });

    it('사용자가 null이면 null을 반환한다', () => {
      expect(getUserPermission(mockDocument, null)).toBeNull();
    });

    it('문서에 permissions가 없으면 null을 반환한다', () => {
      const docWithoutPermissions = { ...mockDocument, permissions: undefined };
      expect(getUserPermission(docWithoutPermissions, mockUser1)).toBeNull();
    });

    it('userId가 문자열이어도 올바르게 비교한다', () => {
      const userWithStringId = { ...mockUser2, id: '2' };
      const permission = getUserPermission(mockDocument, userWithStringId);
      expect(permission?.userId).toBe(2);
    });
  });

  describe('hasWritePermission', () => {
    it('소유자는 쓰기 권한이 있다', () => {
      expect(hasWritePermission(mockDocument, mockUser1)).toBe(true);
    });

    it('WRITE 권한이 있는 사용자는 쓰기 권한이 있다', () => {
      const docWithWritePermission: Document = {
        ...mockDocument,
        permissions: [
          { id: 1, userId: 2, documentId: 1, permissionType: 'WRITE' },
        ] as Permission[],
      };
      expect(hasWritePermission(docWithWritePermission, mockUser2)).toBe(true);
    });

    it('OWNER 권한이 있는 사용자는 쓰기 권한이 있다', () => {
      const docWithOwnerPermission: Document = {
        ...mockDocument,
        permissions: [
          { id: 1, userId: 2, documentId: 1, permissionType: 'OWNER' },
        ] as Permission[],
      };
      expect(hasWritePermission(docWithOwnerPermission, mockUser2)).toBe(true);
    });

    it('READ 권한만 있는 사용자는 쓰기 권한이 없다', () => {
      expect(hasWritePermission(mockDocument, mockUser2)).toBe(false);
    });

    it('권한이 없는 사용자는 쓰기 권한이 없다', () => {
      const userWithoutPermission: User = { id: 999, email: 'user999@example.com', name: 'User 999' };
      expect(hasWritePermission(mockDocument, userWithoutPermission)).toBe(false);
    });

    it('문서가 null이면 false를 반환한다', () => {
      expect(hasWritePermission(null, mockUser1)).toBe(false);
    });

    it('사용자가 null이면 false를 반환한다', () => {
      expect(hasWritePermission(mockDocument, null)).toBe(false);
    });
  });

  describe('hasReadPermission', () => {
    it('소유자는 읽기 권한이 있다', () => {
      expect(hasReadPermission(mockDocument, mockUser1)).toBe(true);
    });

    it('READ 권한이 있는 사용자는 읽기 권한이 있다', () => {
      expect(hasReadPermission(mockDocument, mockUser2)).toBe(true);
    });

    it('WRITE 권한이 있는 사용자는 읽기 권한이 있다', () => {
      const docWithWritePermission: Document = {
        ...mockDocument,
        permissions: [
          { id: 1, userId: 2, documentId: 1, permissionType: 'WRITE' },
        ] as Permission[],
      };
      expect(hasReadPermission(docWithWritePermission, mockUser2)).toBe(true);
    });

    it('OWNER 권한이 있는 사용자는 읽기 권한이 있다', () => {
      const docWithOwnerPermission: Document = {
        ...mockDocument,
        permissions: [
          { id: 1, userId: 2, documentId: 1, permissionType: 'OWNER' },
        ] as Permission[],
      };
      expect(hasReadPermission(docWithOwnerPermission, mockUser2)).toBe(true);
    });

    it('권한이 없는 사용자는 읽기 권한이 없다', () => {
      const userWithoutPermission: User = { id: 999, email: 'user999@example.com', name: 'User 999' };
      expect(hasReadPermission(mockDocument, userWithoutPermission)).toBe(false);
    });

    it('문서가 null이면 false를 반환한다', () => {
      expect(hasReadPermission(null, mockUser1)).toBe(false);
    });

    it('사용자가 null이면 false를 반환한다', () => {
      expect(hasReadPermission(mockDocument, null)).toBe(false);
    });
  });
});

