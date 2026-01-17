/**
 * useDocumentAutoSave 커스텀 훅 단위 테스트
 * 
 * 테스트 대상:
 * - SaveStatus 타입 정의
 * - 디바운스 자동 저장 로직
 * - 권한 체크 로직
 * - beforeunload 이벤트
 * 
 * @see https://github.com/dschoi30/notion-clone/issues/112
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocumentAutoSave } from './useDocumentAutoSave';
import type { Document } from '@/types';
import React from 'react';

// Mock dependencies
vi.mock('@/contexts/DocumentContext', () => ({
    useDocument: () => ({
        updateDocument: vi.fn().mockResolvedValue(undefined),
    }),
}));

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

describe('useDocumentAutoSave', () => {
    // 공유 ref 생성
    const titleRef = { current: '' };
    const contentRef = { current: '' };

    beforeEach(() => {
        vi.useFakeTimers();
        titleRef.current = '';
        contentRef.current = '';
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    describe('초기 상태', () => {
        it('초기 saveStatus는 "saved"이다', () => {
            const document = createMockDocument();
            const { result } = renderHook(() =>
                useDocumentAutoSave(
                    document,
                    titleRef as React.MutableRefObject<string>,
                    contentRef as React.MutableRefObject<string>,
                    {
                        canWrite: true,
                        isReadOnly: false,
                    }
                )
            );

            expect(result.current.saveStatus).toBe('saved');
        });

        it('isSaving이 false로 초기화된다', () => {
            const document = createMockDocument();
            const { result } = renderHook(() =>
                useDocumentAutoSave(
                    document,
                    titleRef as React.MutableRefObject<string>,
                    contentRef as React.MutableRefObject<string>,
                    {
                        canWrite: true,
                        isReadOnly: false,
                    }
                )
            );

            expect(result.current.isSaving).toBe(false);
        });
    });

    describe('권한 체크', () => {
        it('canWrite가 false이면 triggerAutoSave를 호출해도 저장하지 않는다', async () => {
            const document = createMockDocument();
            const { result } = renderHook(() =>
                useDocumentAutoSave(
                    document,
                    titleRef as React.MutableRefObject<string>,
                    contentRef as React.MutableRefObject<string>,
                    {
                        canWrite: false,
                        isReadOnly: false,
                    }
                )
            );

            act(() => {
                result.current.triggerAutoSave();
            });

            // 디바운스 시간 경과
            await act(async () => {
                vi.advanceTimersByTime(600);
            });

            // saveStatus가 변경되지 않아야 함
            expect(result.current.saveStatus).toBe('saved');
        });

        it('isReadOnly가 true이면 triggerAutoSave를 호출해도 저장하지 않는다', async () => {
            const document = createMockDocument();
            const { result } = renderHook(() =>
                useDocumentAutoSave(
                    document,
                    titleRef as React.MutableRefObject<string>,
                    contentRef as React.MutableRefObject<string>,
                    {
                        canWrite: true,
                        isReadOnly: true,
                    }
                )
            );

            act(() => {
                result.current.triggerAutoSave();
            });

            await act(async () => {
                vi.advanceTimersByTime(600);
            });

            expect(result.current.saveStatus).toBe('saved');
        });
    });

    describe('setSaveStatus', () => {
        it('setSaveStatus로 저장 상태를 변경할 수 있다', () => {
            const document = createMockDocument();
            const { result } = renderHook(() =>
                useDocumentAutoSave(
                    document,
                    titleRef as React.MutableRefObject<string>,
                    contentRef as React.MutableRefObject<string>,
                    {
                        canWrite: true,
                        isReadOnly: false,
                    }
                )
            );

            act(() => {
                result.current.setSaveStatus('unsaved');
            });

            expect(result.current.saveStatus).toBe('unsaved');
        });

        it('모든 SaveStatus 타입으로 변경 가능하다', () => {
            const document = createMockDocument();
            const { result } = renderHook(() =>
                useDocumentAutoSave(
                    document,
                    titleRef as React.MutableRefObject<string>,
                    contentRef as React.MutableRefObject<string>,
                    {
                        canWrite: true,
                        isReadOnly: false,
                    }
                )
            );

            const statuses: Array<'saved' | 'saving' | 'error' | 'unsaved'> = [
                'saved',
                'saving',
                'error',
                'unsaved',
            ];

            for (const status of statuses) {
                act(() => {
                    result.current.setSaveStatus(status);
                });
                expect(result.current.saveStatus).toBe(status);
            }
        });
    });

    describe('문서 없음 처리', () => {
        it('currentDocument가 null이면 handleSave를 호출해도 아무 일도 일어나지 않는다', async () => {
            const { result } = renderHook(() =>
                useDocumentAutoSave(
                    null,
                    titleRef as React.MutableRefObject<string>,
                    contentRef as React.MutableRefObject<string>,
                    {
                        canWrite: true,
                        isReadOnly: false,
                    }
                )
            );

            await act(async () => {
                await result.current.handleSave();
            });

            expect(result.current.saveStatus).toBe('saved');
        });
    });

    describe('cancelPendingSave', () => {
        it('cancelPendingSave로 대기 중인 저장을 취소할 수 있다', () => {
            const document = createMockDocument();
            const { result } = renderHook(() =>
                useDocumentAutoSave(
                    document,
                    titleRef as React.MutableRefObject<string>,
                    contentRef as React.MutableRefObject<string>,
                    {
                        canWrite: true,
                        isReadOnly: false,
                    }
                )
            );

            act(() => {
                result.current.triggerAutoSave();
            });

            // 취소
            act(() => {
                result.current.cancelPendingSave();
            });

            // 디바운스 시간 경과해도 저장되지 않음
            act(() => {
                vi.advanceTimersByTime(1000);
            });

            expect(result.current.saveStatus).toBe('saved');
        });
    });

    describe('onSaveError 콜백', () => {
        it('권한 없을 때 onSaveError가 호출된다', async () => {
            const onSaveError = vi.fn();
            const document = createMockDocument();
            const { result } = renderHook(() =>
                useDocumentAutoSave(
                    document,
                    titleRef as React.MutableRefObject<string>,
                    contentRef as React.MutableRefObject<string>,
                    {
                        canWrite: false,
                        isReadOnly: false,
                        onSaveError,
                    }
                )
            );

            await act(async () => {
                await result.current.handleSave();
            });

            expect(onSaveError).toHaveBeenCalledWith('문서 저장 권한이 없습니다.');
        });
    });
});
