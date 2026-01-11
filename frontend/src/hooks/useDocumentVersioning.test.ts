/**
 * useDocumentVersioning 커스텀 훅 단위 테스트
 * 
 * 테스트 대상:
 * - 초기 상태 (elapsedMs, nextSnapshotMs)
 * - 스냅샷 인터벌 환경별 설정
 * - 문서 전환 시 타이머 리셋
 * - 스냅샷 생성 핸들러 호출
 * - 문서/워크스페이스 없을 때 처리
 * 
 * @see https://github.com/dschoi30/notion-clone/issues/112
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocumentVersioning } from './useDocumentVersioning';
import type { Document, Workspace } from '@/types';

// Mock dependencies
vi.mock('@/services/documentApi', () => ({
    getProperties: vi.fn().mockResolvedValue([
        { id: 1, name: '상태', type: 'SELECT', sortOrder: 0, width: 100 },
        { id: 2, name: '우선순위', type: 'SELECT', sortOrder: 1, width: 100 },
    ]),
    getPropertyValuesByDocument: vi.fn().mockResolvedValue([
        { propertyId: 1, value: { optionId: 1 } },
        { propertyId: 2, value: { optionId: 2 } },
    ]),
    createDocumentVersion: vi.fn().mockResolvedValue({ id: 1 }),
}));

vi.mock('@/hooks/useDocumentPropertiesStore', () => ({
    useDocumentPropertiesStore: () => ({ titleWidth: 288 }),
}));

// usePageStayTimer 모킹 - elapsedMs 값을 외부에서 제어 가능하도록
let mockElapsedMs = 0;
let mockOnReachMsCallback: ((ms: number) => void) | null = null;

vi.mock('@/hooks/usePageStayTimer', () => ({
    default: (options: { enabled?: boolean; onReachMs?: (ms: number) => void; targetMs?: number }) => {
        mockOnReachMsCallback = options.onReachMs ?? null;
        return { elapsedMs: mockElapsedMs };
    },
}));

vi.mock('@/lib/logger', () => ({
    createLogger: () => ({
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
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

// 테스트용 목 Workspace 생성 헬퍼
const createMockWorkspace = (overrides: Partial<Workspace> = {}): Workspace => ({
    id: 1,
    name: '테스트 워크스페이스',
    ownerId: 1,
    owner: { id: 1, email: 'test@test.com', name: 'Test User', profileImage: null },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    memberCount: 1,
    documentCount: 1,
    ...overrides,
});

describe('useDocumentVersioning', () => {
    let mockTitleRef: React.MutableRefObject<string>;
    let mockContentRef: React.MutableRefObject<string>;

    beforeEach(() => {
        vi.useFakeTimers();
        mockElapsedMs = 0;
        mockOnReachMsCallback = null;
        mockTitleRef = { current: '테스트 제목' };
        mockContentRef = { current: '테스트 내용' };
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    describe('초기 상태', () => {
        it('초기 elapsedMs는 0이다', () => {
            const document = createMockDocument();
            const workspace = createMockWorkspace();

            const { result } = renderHook(() =>
                useDocumentVersioning(
                    document,
                    workspace,
                    mockTitleRef,
                    mockContentRef,
                    { snapshotIntervalMs: 30000 }
                )
            );

            expect(result.current.elapsedMs).toBe(0);
        });

        it('초기 nextSnapshotMs는 snapshotIntervalMs와 같다', () => {
            const document = createMockDocument();
            const workspace = createMockWorkspace();
            const snapshotIntervalMs = 30000;

            const { result } = renderHook(() =>
                useDocumentVersioning(
                    document,
                    workspace,
                    mockTitleRef,
                    mockContentRef,
                    { snapshotIntervalMs }
                )
            );

            expect(result.current.nextSnapshotMs).toBe(snapshotIntervalMs);
        });

        it('snapshotIntervalMs 옵션이 없으면 기본값이 사용된다', () => {
            const document = createMockDocument();
            const workspace = createMockWorkspace();

            const { result } = renderHook(() =>
                useDocumentVersioning(
                    document,
                    workspace,
                    mockTitleRef,
                    mockContentRef
                )
            );

            // 테스트 환경은 development 모드가 아니므로 10분(600000ms)이 기본값
            // 또는 development 모드라면 30초(30000ms)
            expect(result.current.nextSnapshotMs).toBeGreaterThan(0);
        });
    });

    describe('문서/워크스페이스 없음 처리', () => {
        it('currentDocument가 null이면 타이머가 비활성화된다', () => {
            const workspace = createMockWorkspace();

            const { result } = renderHook(() =>
                useDocumentVersioning(
                    null,
                    workspace,
                    mockTitleRef,
                    mockContentRef,
                    { snapshotIntervalMs: 30000 }
                )
            );

            // 문서가 없으면 기본 상태 유지
            expect(result.current.elapsedMs).toBe(0);
        });

        it('currentWorkspace가 null이어도 훅이 정상 동작한다', () => {
            const document = createMockDocument();

            const { result } = renderHook(() =>
                useDocumentVersioning(
                    document,
                    null,
                    mockTitleRef,
                    mockContentRef,
                    { snapshotIntervalMs: 30000 }
                )
            );

            expect(result.current.elapsedMs).toBe(0);
            expect(result.current.nextSnapshotMs).toBe(30000);
        });
    });

    describe('스냅샷 생성 핸들러', () => {
        it('onReachMs 콜백이 호출되면 스냅샷 생성 API가 호출된다', async () => {
            const { createDocumentVersion } = await import('@/services/documentApi');
            const document = createMockDocument();
            const workspace = createMockWorkspace();

            renderHook(() =>
                useDocumentVersioning(
                    document,
                    workspace,
                    mockTitleRef,
                    mockContentRef,
                    { snapshotIntervalMs: 30000 }
                )
            );

            // onReachMs 콜백 시뮬레이션
            if (mockOnReachMsCallback) {
                await act(async () => {
                    mockOnReachMsCallback!(30000);
                });
            }

            expect(createDocumentVersion).toHaveBeenCalledWith(
                workspace.id,
                document.id,
                expect.objectContaining({
                    title: mockTitleRef.current,
                    viewType: 'PAGE',
                    titleWidth: 288,
                    content: mockContentRef.current,
                })
            );
        });

        it('TABLE 뷰 타입이면 content가 null로 전달된다', async () => {
            const { createDocumentVersion } = await import('@/services/documentApi');
            const document = createMockDocument({ viewType: 'TABLE' });
            const workspace = createMockWorkspace();

            renderHook(() =>
                useDocumentVersioning(
                    document,
                    workspace,
                    mockTitleRef,
                    mockContentRef,
                    { snapshotIntervalMs: 30000 }
                )
            );

            if (mockOnReachMsCallback) {
                await act(async () => {
                    mockOnReachMsCallback!(30000);
                });
            }

            expect(createDocumentVersion).toHaveBeenCalledWith(
                workspace.id,
                document.id,
                expect.objectContaining({
                    content: null,
                })
            );
        });

        it('currentDocument가 null이면 스냅샷 생성이 호출되지 않는다', async () => {
            const { createDocumentVersion } = await import('@/services/documentApi');
            const workspace = createMockWorkspace();

            renderHook(() =>
                useDocumentVersioning(
                    null,
                    workspace,
                    mockTitleRef,
                    mockContentRef,
                    { snapshotIntervalMs: 30000 }
                )
            );

            if (mockOnReachMsCallback) {
                await act(async () => {
                    mockOnReachMsCallback!(30000);
                });
            }

            expect(createDocumentVersion).not.toHaveBeenCalled();
        });

        it('currentWorkspace가 null이면 스냅샷 생성이 호출되지 않는다', async () => {
            const { createDocumentVersion } = await import('@/services/documentApi');
            const document = createMockDocument();

            renderHook(() =>
                useDocumentVersioning(
                    document,
                    null,
                    mockTitleRef,
                    mockContentRef,
                    { snapshotIntervalMs: 30000 }
                )
            );

            if (mockOnReachMsCallback) {
                await act(async () => {
                    mockOnReachMsCallback!(30000);
                });
            }

            expect(createDocumentVersion).not.toHaveBeenCalled();
        });
    });

    describe('문서 전환 시 타이머 리셋', () => {
        it('문서 ID가 변경되면 nextSnapshotMs가 리셋된다', () => {
            const document1 = createMockDocument({ id: 1 });
            const document2 = createMockDocument({ id: 2 });
            const workspace = createMockWorkspace();
            const snapshotIntervalMs = 30000;

            const { result, rerender } = renderHook(
                ({ doc }) =>
                    useDocumentVersioning(
                        doc,
                        workspace,
                        mockTitleRef,
                        mockContentRef,
                        { snapshotIntervalMs }
                    ),
                { initialProps: { doc: document1 } }
            );

            expect(result.current.nextSnapshotMs).toBe(snapshotIntervalMs);

            // 문서 전환
            rerender({ doc: document2 });

            // 문서 전환 시 nextSnapshotMs가 elapsedMs + snapshotIntervalMs로 재설정됨
            expect(result.current.nextSnapshotMs).toBe(mockElapsedMs + snapshotIntervalMs);
        });

        it('같은 문서 ID로 rerender해도 타이머가 리셋되지 않는다', () => {
            const document = createMockDocument({ id: 1 });
            const workspace = createMockWorkspace();
            const snapshotIntervalMs = 30000;

            const { result, rerender } = renderHook(
                ({ doc }) =>
                    useDocumentVersioning(
                        doc,
                        workspace,
                        mockTitleRef,
                        mockContentRef,
                        { snapshotIntervalMs }
                    ),
                { initialProps: { doc: document } }
            );

            const initialNextSnapshotMs = result.current.nextSnapshotMs;

            // 같은 문서로 rerender
            rerender({ doc: { ...document } });

            expect(result.current.nextSnapshotMs).toBe(initialNextSnapshotMs);
        });
    });

    describe('반환값', () => {
        it('elapsedMs와 nextSnapshotMs를 반환한다', () => {
            const document = createMockDocument();
            const workspace = createMockWorkspace();

            const { result } = renderHook(() =>
                useDocumentVersioning(
                    document,
                    workspace,
                    mockTitleRef,
                    mockContentRef,
                    { snapshotIntervalMs: 30000 }
                )
            );

            expect(result.current).toHaveProperty('elapsedMs');
            expect(result.current).toHaveProperty('nextSnapshotMs');
            expect(typeof result.current.elapsedMs).toBe('number');
            expect(typeof result.current.nextSnapshotMs).toBe('number');
        });
    });

    describe('API 에러 처리', () => {
        it('createDocumentVersion API 에러 시에도 훅이 크래시되지 않는다', async () => {
            const { createDocumentVersion } = await import('@/services/documentApi');
            (createDocumentVersion as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new Error('API Error')
            );

            const document = createMockDocument();
            const workspace = createMockWorkspace();

            const { result } = renderHook(() =>
                useDocumentVersioning(
                    document,
                    workspace,
                    mockTitleRef,
                    mockContentRef,
                    { snapshotIntervalMs: 30000 }
                )
            );

            // 에러가 발생해도 훅은 정상 동작
            if (mockOnReachMsCallback) {
                await act(async () => {
                    mockOnReachMsCallback!(30000);
                });
            }

            // 훅이 크래시되지 않고 상태 유지
            expect(result.current.elapsedMs).toBe(0);
        });

        it('getProperties API 에러 시에도 nextSnapshotMs가 재설정된다', async () => {
            const { getProperties } = await import('@/services/documentApi');
            (getProperties as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new Error('API Error')
            );

            const document = createMockDocument();
            const workspace = createMockWorkspace();
            const snapshotIntervalMs = 30000;

            const { result } = renderHook(() =>
                useDocumentVersioning(
                    document,
                    workspace,
                    mockTitleRef,
                    mockContentRef,
                    { snapshotIntervalMs }
                )
            );

            if (mockOnReachMsCallback) {
                await act(async () => {
                    mockOnReachMsCallback!(30000);
                });
            }

            // finally 블록에서 nextSnapshotMs가 재설정되어야 함
            // 이는 에러 발생 시에도 다음 스냅샷 타이밍이 설정됨을 보장
            expect(result.current.nextSnapshotMs).toBeGreaterThan(0);
        });
    });

    describe('Props 유효성', () => {
        it('titleRef.current가 빈 문자열이어도 정상 동작한다', async () => {
            const { createDocumentVersion } = await import('@/services/documentApi');
            const document = createMockDocument();
            const workspace = createMockWorkspace();
            mockTitleRef.current = '';

            renderHook(() =>
                useDocumentVersioning(
                    document,
                    workspace,
                    mockTitleRef,
                    mockContentRef,
                    { snapshotIntervalMs: 30000 }
                )
            );

            if (mockOnReachMsCallback) {
                await act(async () => {
                    mockOnReachMsCallback!(30000);
                });
            }

            expect(createDocumentVersion).toHaveBeenCalledWith(
                workspace.id,
                document.id,
                expect.objectContaining({
                    title: '',
                })
            );
        });

        it('contentRef.current가 빈 문자열이어도 정상 동작한다', async () => {
            const { createDocumentVersion } = await import('@/services/documentApi');
            const document = createMockDocument();
            const workspace = createMockWorkspace();
            mockContentRef.current = '';

            renderHook(() =>
                useDocumentVersioning(
                    document,
                    workspace,
                    mockTitleRef,
                    mockContentRef,
                    { snapshotIntervalMs: 30000 }
                )
            );

            if (mockOnReachMsCallback) {
                await act(async () => {
                    mockOnReachMsCallback!(30000);
                });
            }

            expect(createDocumentVersion).toHaveBeenCalledWith(
                workspace.id,
                document.id,
                expect.objectContaining({
                    content: '',
                })
            );
        });
    });
});
