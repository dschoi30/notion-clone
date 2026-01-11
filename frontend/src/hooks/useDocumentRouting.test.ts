/**
 * useDocumentRouting 커스텀 훅 단위 테스트
 * 
 * 테스트 대상:
 * - parseDocIdFromSlug: URL slug에서 문서 ID 추출
 * - getDocumentPath: 문서 계층 경로 계산
 * 
 * @see https://github.com/dschoi30/notion-clone/issues/112
 */
import { describe, it, expect } from 'vitest';
import { parseDocIdFromSlug, getDocumentPath } from './useDocumentRouting';
import type { Document } from '@/types';

// 테스트용 목 Document 생성 헬퍼
const createMockDocument = (
    id: number,
    title: string,
    parentId?: number
): Document => ({
    id,
    title,
    content: '',
    viewType: 'PAGE',
    workspaceId: 1,
    userId: 1,
    isTrashed: false,
    isLocked: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    parentId,
});

describe('parseDocIdFromSlug', () => {
    describe('유효한 slug 형식', () => {
        it('숫자-제목 형식에서 ID를 추출한다', () => {
            expect(parseDocIdFromSlug('123-document-title')).toBe('123');
        });

        it('긴 숫자 ID도 처리한다', () => {
            expect(parseDocIdFromSlug('160071-테스트-문서')).toBe('160071');
        });

        it('숫자만 있는 형식도 처리한다', () => {
            expect(parseDocIdFromSlug('123')).toBe('123');
        });

        it('한글 제목이 포함된 slug도 처리한다', () => {
            expect(parseDocIdFromSlug('456-한글-제목-테스트')).toBe('456');
        });

        it('특수문자가 포함된 slug도 처리한다', () => {
            expect(parseDocIdFromSlug('789-hello-world-123')).toBe('789');
        });
    });

    describe('유효하지 않은 slug 형식', () => {
        it('undefined를 전달하면 null을 반환한다', () => {
            expect(parseDocIdFromSlug(undefined)).toBeNull();
        });

        it('빈 문자열을 전달하면 null을 반환한다', () => {
            expect(parseDocIdFromSlug('')).toBeNull();
        });

        it('숫자로 시작하지 않는 slug는 null을 반환한다', () => {
            expect(parseDocIdFromSlug('document-title')).toBeNull();
        });

        it('하이픈 없이 문자가 섞인 경우 null을 반환한다', () => {
            expect(parseDocIdFromSlug('abc123')).toBeNull();
        });
    });
});

describe('getDocumentPath', () => {
    const documents: Document[] = [
        createMockDocument(1, '루트 문서 1'),
        createMockDocument(2, '루트 문서 2'),
        createMockDocument(3, '자식 문서 1', 1),
        createMockDocument(4, '손자 문서 1', 3),
        createMockDocument(5, '자식 문서 2', 2),
    ];

    describe('경로 계산', () => {
        it('루트 문서의 경로는 자기 자신만 포함한다', () => {
            const path = getDocumentPath(1, documents);
            expect(path).toHaveLength(1);
            expect(path[0].id).toBe(1);
        });

        it('자식 문서의 경로는 부모와 자신을 포함한다', () => {
            const path = getDocumentPath(3, documents);
            expect(path).toHaveLength(2);
            expect(path[0].id).toBe(1); // 부모
            expect(path[1].id).toBe(3); // 자신
        });

        it('손자 문서의 경로는 루트부터 자신까지 포함한다', () => {
            const path = getDocumentPath(4, documents);
            expect(path).toHaveLength(3);
            expect(path[0].id).toBe(1); // 조부모
            expect(path[1].id).toBe(3); // 부모
            expect(path[2].id).toBe(4); // 자신
        });
    });

    describe('목록에 없는 문서 처리', () => {
        it('목록에 없는 문서 ID는 빈 배열을 반환한다', () => {
            const path = getDocumentPath(999, documents);
            expect(path).toHaveLength(0);
        });

        it('currentDocument fallback을 사용하여 목록에 없는 문서도 경로에 포함한다', () => {
            const orphanDoc = createMockDocument(999, '고아 문서');
            const path = getDocumentPath(999, documents, orphanDoc);
            expect(path).toHaveLength(1);
            expect(path[0].id).toBe(999);
        });

        it('부모가 목록에 없는 경우 자신까지만 표시한다', () => {
            const orphanChild = createMockDocument(100, '고아 자식', 999); // 부모 999가 없음
            const documentsWithOrphan = [...documents, orphanChild];
            const path = getDocumentPath(100, documentsWithOrphan);
            expect(path).toHaveLength(1);
            expect(path[0].id).toBe(100);
        });
    });

    describe('빈 문서 목록 처리', () => {
        it('빈 목록에서는 빈 배열을 반환한다', () => {
            const path = getDocumentPath(1, []);
            expect(path).toHaveLength(0);
        });

        it('빈 목록이지만 currentDocument가 있으면 경로에 포함한다', () => {
            const doc = createMockDocument(1, '테스트');
            const path = getDocumentPath(1, [], doc);
            expect(path).toHaveLength(1);
        });
    });
});
