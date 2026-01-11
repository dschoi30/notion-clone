/**
 * useDocumentEditing 커스텀 훅 단위 테스트
 * 
 * 테스트 대상:
 * - 제목/내용 상태 관리
 * - currentDocument 변경 시 동기화
 * - triggerAutoSave 및 setSaveStatus 호출
 * 
 * @see https://github.com/dschoi30/notion-clone/issues/112
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import type { Document } from '@/types';

// Mock dependencies before importing the hook
vi.mock('react-router-dom', () => ({
    useLocation: () => ({ pathname: '/1-test-document' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 1, name: '테스트 사용자', email: 'test@example.com' },
    }),
}));

vi.mock('@/hooks/useDocumentSocket', () => ({
    default: () => ({
        sendEdit: vi.fn(),
    }),
}));

vi.mock('@/hooks/useDocumentPropertiesStore', () => ({
    useDocumentPropertiesStore: () => vi.fn(),
}));

// 목 함수들
const mockTriggerAutoSave = vi.fn();
const mockSetSaveStatus = vi.fn();

// Import after mocks
import { useDocumentEditing } from './useDocumentEditing';

// 테스트용 목 Document 생성 헬퍼
const createMockDocument = (overrides: Partial<Document> = {}): Document => ({
    id: 1,
    title: '테스트 문서',
    content: '테스트 내용',
    viewType: 'PAGE',
    workspaceId: 1,
    userId: 1,
    isTrashed: false,
    isLocked: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
});

describe('useDocumentEditing', () => {
    const titleRef = { current: '' };
    const contentRef = { current: '' };

    beforeEach(() => {
        vi.clearAllMocks();
        titleRef.current = '';
        contentRef.current = '';
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('초기 상태', () => {
        it('currentDocument가 null일 때 title과 content가 빈 문자열이다', () => {
            const { result } = renderHook(() =>
                useDocumentEditing(null, {
                    triggerAutoSave: mockTriggerAutoSave,
                    setSaveStatus: mockSetSaveStatus,
                    titleRef: titleRef as React.MutableRefObject<string>,
                    contentRef: contentRef as React.MutableRefObject<string>,
                })
            );

            expect(result.current.title).toBe('');
            expect(result.current.content).toBe('');
        });

        it('currentDocument가 null일 때 documentId가 undefined이다', () => {
            const { result } = renderHook(() =>
                useDocumentEditing(null, {
                    triggerAutoSave: mockTriggerAutoSave,
                    setSaveStatus: mockSetSaveStatus,
                    titleRef: titleRef as React.MutableRefObject<string>,
                    contentRef: contentRef as React.MutableRefObject<string>,
                })
            );

            expect(result.current.documentId).toBeUndefined();
        });
    });

    describe('문서 동기화', () => {
        it('currentDocument가 설정되면 title과 content가 동기화된다', () => {
            const document = createMockDocument({
                title: '문서 제목',
                content: '문서 내용',
            });

            const { result } = renderHook(() =>
                useDocumentEditing(document, {
                    triggerAutoSave: mockTriggerAutoSave,
                    setSaveStatus: mockSetSaveStatus,
                    titleRef: titleRef as React.MutableRefObject<string>,
                    contentRef: contentRef as React.MutableRefObject<string>,
                })
            );

            expect(result.current.title).toBe('문서 제목');
            expect(result.current.content).toBe('문서 내용');
        });

        it('currentDocument.content가 없으면 빈 문자열로 설정된다', () => {
            const document = createMockDocument({
                title: '제목만',
                content: '',
            });

            const { result } = renderHook(() =>
                useDocumentEditing(document, {
                    triggerAutoSave: mockTriggerAutoSave,
                    setSaveStatus: mockSetSaveStatus,
                    titleRef: titleRef as React.MutableRefObject<string>,
                    contentRef: contentRef as React.MutableRefObject<string>,
                })
            );

            expect(result.current.content).toBe('');
        });

        it('documentId가 currentDocument.id와 동기화된다', () => {
            const document = createMockDocument({ id: 123 });

            const { result } = renderHook(() =>
                useDocumentEditing(document, {
                    triggerAutoSave: mockTriggerAutoSave,
                    setSaveStatus: mockSetSaveStatus,
                    titleRef: titleRef as React.MutableRefObject<string>,
                    contentRef: contentRef as React.MutableRefObject<string>,
                })
            );

            expect(result.current.documentId).toBe(123);
        });
    });

    describe('제목 변경', () => {
        it('handleTitleChange가 triggerAutoSave와 setSaveStatus를 호출한다', () => {
            const document = createMockDocument();

            const { result } = renderHook(() =>
                useDocumentEditing(document, {
                    triggerAutoSave: mockTriggerAutoSave,
                    setSaveStatus: mockSetSaveStatus,
                    titleRef: titleRef as React.MutableRefObject<string>,
                    contentRef: contentRef as React.MutableRefObject<string>,
                })
            );

            act(() => {
                const event = {
                    target: { value: '새 제목' },
                } as React.ChangeEvent<HTMLInputElement>;
                result.current.handleTitleChange(event);
            });

            expect(mockTriggerAutoSave).toHaveBeenCalled();
            expect(mockSetSaveStatus).toHaveBeenCalledWith('unsaved');
        });
    });

    describe('내용 변경', () => {
        it('handleContentChange가 triggerAutoSave와 setSaveStatus를 호출한다', () => {
            const document = createMockDocument();

            const { result } = renderHook(() =>
                useDocumentEditing(document, {
                    triggerAutoSave: mockTriggerAutoSave,
                    setSaveStatus: mockSetSaveStatus,
                    titleRef: titleRef as React.MutableRefObject<string>,
                    contentRef: contentRef as React.MutableRefObject<string>,
                })
            );

            act(() => {
                result.current.handleContentChange('새로운 내용');
            });

            expect(mockTriggerAutoSave).toHaveBeenCalled();
            expect(mockSetSaveStatus).toHaveBeenCalledWith('unsaved');
        });
    });

    describe('setTitle과 setContent (문서가 없을 때)', () => {
        it('문서가 없을 때 setTitle로 제목을 직접 설정할 수 있다', () => {
            const { result } = renderHook(() =>
                useDocumentEditing(null, {
                    triggerAutoSave: mockTriggerAutoSave,
                    setSaveStatus: mockSetSaveStatus,
                    titleRef: titleRef as React.MutableRefObject<string>,
                    contentRef: contentRef as React.MutableRefObject<string>,
                })
            );

            act(() => {
                result.current.setTitle('직접 설정한 제목');
            });

            expect(result.current.title).toBe('직접 설정한 제목');
        });

        it('문서가 없을 때 setContent로 내용을 직접 설정할 수 있다', () => {
            const { result } = renderHook(() =>
                useDocumentEditing(null, {
                    triggerAutoSave: mockTriggerAutoSave,
                    setSaveStatus: mockSetSaveStatus,
                    titleRef: titleRef as React.MutableRefObject<string>,
                    contentRef: contentRef as React.MutableRefObject<string>,
                })
            );

            act(() => {
                result.current.setContent('직접 설정한 내용');
            });

            expect(result.current.content).toBe('직접 설정한 내용');
        });
    });
});
