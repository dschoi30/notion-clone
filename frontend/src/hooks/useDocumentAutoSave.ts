/**
 * useDocumentAutoSave.ts
 * 문서 자동 저장 및 디바운스 로직을 담당하는 커스텀 훅
 * 
 * @see https://github.com/dschoi30/notion-clone/issues/112
 */
import { useState, useRef, useEffect, useCallback, Dispatch, SetStateAction, MutableRefObject } from 'react';
import { useDocument } from '@/contexts/DocumentContext';
import { createLogger } from '@/lib/logger';
import type { Document } from '@/types';

const log = createLogger('autosave');

export type SaveStatus = 'saved' | 'saving' | 'error' | 'unsaved';

interface UseDocumentAutoSaveOptions {
    /** 자동 저장 디바운스 지연 시간 (ms), 기본값: 500 */
    debounceMs?: number;
    /** 쓰기 권한 여부 */
    canWrite: boolean;
    /** 읽기 전용 여부 */
    isReadOnly: boolean;
    /** 저장 에러 콜백 (토스트 등) */
    onSaveError?: (message: string) => void;
}

interface UseDocumentAutoSaveReturn {
    /** 현재 저장 상태 */
    saveStatus: SaveStatus;
    /** 저장 상태 직접 설정 (외부에서 필요한 경우) */
    setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
    /** 자동 저장 트리거 (디바운스됨) */
    triggerAutoSave: () => void;
    /** 즉시 저장 실행 */
    handleSave: () => Promise<void>;
    /** 제목 ref (최신 값 참조용) */
    titleRef: MutableRefObject<string>;
    /** 내용 ref (최신 값 참조용) */
    contentRef: MutableRefObject<string>;
    /** 저장 중 여부 (네비게이션 가드용) */
    isSaving: boolean;
    /** 대기 중인 변경사항 취소 */
    cancelPendingSave: () => void;
}

/** 이전 문서 데이터를 저장하기 위한 인터페이스 */
interface PrevDocumentData {
    id: number;
    title: string;
    content: string;
}

/**
 * 문서 자동 저장 로직을 담당하는 커스텀 훅
 * - 디바운스된 자동 저장
 * - 저장 상태 관리 (saved/saving/error/unsaved)
 * - 탭 닫기 시 beforeunload 이벤트로 경고
 * - 문서 전환 시 이전 문서 저장 (데이터 정확성 보장)
 */
export function useDocumentAutoSave(
    currentDocument: Document | null,
    title: string,
    content: string,
    options: UseDocumentAutoSaveOptions
): UseDocumentAutoSaveReturn {
    const { debounceMs = 500, canWrite, isReadOnly, onSaveError } = options;

    const { updateDocument } = useDocument();

    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const [isSaving, setIsSaving] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // 이전 문서 데이터 저장 (문서 전환 시 정확한 데이터 저장을 위해)
    const prevDocumentDataRef = useRef<PrevDocumentData | null>(null);

    // 최신 값을 참조하기 위한 ref
    const titleRef = useRef<string>(title);
    const contentRef = useRef<string>(content);

    // 최신 핸들러를 참조하기 위한 ref (언마운트 시 사용)
    const handleSaveRef = useRef<() => Promise<void>>();
    const canWriteRef = useRef(canWrite);
    const isReadOnlyRef = useRef(isReadOnly);

    // ref 동기화
    useEffect(() => {
        titleRef.current = title;
    }, [title]);

    useEffect(() => {
        contentRef.current = content;
    }, [content]);

    useEffect(() => {
        canWriteRef.current = canWrite;
        isReadOnlyRef.current = isReadOnly;
    }, [canWrite, isReadOnly]);

    // 저장 핸들러
    const handleSave = useCallback(async () => {
        if (!currentDocument) return;

        // 권한 체크
        if (!canWrite || isReadOnly) {
            log.warn('문서 저장 실패: 권한 없음', {
                documentId: currentDocument.id,
                canWrite,
                isReadOnly,
            });
            setSaveStatus('error');
            onSaveError?.('문서 저장 권한이 없습니다.');
            return;
        }

        try {
            setIsSaving(true);
            setSaveStatus('saving');
            log.info('updateDocument(save)', { id: currentDocument.id });
            await updateDocument(currentDocument.id, {
                title: titleRef.current || '',
                content: contentRef.current,
            });
            setSaveStatus('saved');
        } catch (error: unknown) {
            console.error('문서 저장 실패:', error);
            setSaveStatus('error');

            // 403 에러인 경우 추가 로깅
            const apiError = error as { response?: { status?: number }; message?: string };
            if (apiError?.response?.status === 403) {
                log.error('문서 저장 실패: 권한 없음 (403)', {
                    documentId: currentDocument.id,
                    error: apiError.message,
                });
                onSaveError?.('문서 저장 권한이 없습니다.');
            } else {
                onSaveError?.('문서 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
            }
        } finally {
            setIsSaving(false);
        }
    }, [currentDocument, canWrite, isReadOnly, updateDocument, onSaveError]);

    // handleSave ref 동기화
    useEffect(() => {
        handleSaveRef.current = handleSave;
    }, [handleSave]);

    // 대기 중인 저장 취소
    const cancelPendingSave = useCallback(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
            debounceTimer.current = null;
        }
    }, []);

    // 자동 저장 트리거 (디바운스)
    const triggerAutoSave = useCallback(() => {
        // 권한이 없으면 자동 저장하지 않음
        if (!canWrite || isReadOnly) {
            return;
        }

        cancelPendingSave();

        debounceTimer.current = setTimeout(() => {
            handleSave();
        }, debounceMs);
    }, [canWrite, isReadOnly, handleSave, debounceMs, cancelPendingSave]);

    // beforeunload 이벤트 핸들러 (탭 닫기 시 경고)
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (saveStatus === 'unsaved' || saveStatus === 'saving') {
                e.preventDefault();
                // 동기적으로 저장 시도 (완료 보장은 안됨)
                if (handleSaveRef.current && canWriteRef.current && !isReadOnlyRef.current) {
                    handleSaveRef.current();
                }
                // 표준 메시지 반환
                return '저장되지 않은 변경사항이 있습니다. 페이지를 떠나시겠습니까?';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [saveStatus]);

    // 컴포넌트 언마운트 시 저장 (ref 패턴 사용)
    useEffect(() => {
        return () => {
            cancelPendingSave();
            // ref를 통해 최신 핸들러 호출 (의존성 문제 해결)
            if (handleSaveRef.current && canWriteRef.current && !isReadOnlyRef.current) {
                handleSaveRef.current();
            }
        };
    }, [cancelPendingSave]);

    // 문서 전환 시 이전 문서 저장 (데이터 정확성 보장)
    useEffect(() => {
        // 현재 문서 데이터를 저장하기 전에 이전 문서 저장
        if (
            prevDocumentDataRef.current &&
            saveStatus === 'unsaved' &&
            prevDocumentDataRef.current.id !== currentDocument?.id
        ) {
            const prevData = prevDocumentDataRef.current;
            log.info('문서 전환: 이전 문서 저장', { prevId: prevData.id, newId: currentDocument?.id });

            updateDocument(prevData.id, {
                title: prevData.title,
                content: prevData.content,
            }).catch(err => {
                log.error('이전 문서 저장 실패', { id: prevData.id, error: err });
                onSaveError?.('이전 문서 저장에 실패했습니다.');
            });
        }

        // 현재 문서 데이터 스냅샷 저장
        if (currentDocument) {
            prevDocumentDataRef.current = {
                id: currentDocument.id,
                title: titleRef.current,
                content: contentRef.current,
            };
        } else {
            prevDocumentDataRef.current = null;
        }
    }, [currentDocument, saveStatus, updateDocument, onSaveError]);

    // title/content 변경 시 prevDocumentDataRef 업데이트
    useEffect(() => {
        if (prevDocumentDataRef.current && currentDocument) {
            prevDocumentDataRef.current.title = titleRef.current;
            prevDocumentDataRef.current.content = contentRef.current;
        }
    }, [title, content, currentDocument]);

    return {
        saveStatus,
        setSaveStatus,
        triggerAutoSave,
        handleSave,
        titleRef,
        contentRef,
        isSaving,
        cancelPendingSave,
    };
}

export default useDocumentAutoSave;
