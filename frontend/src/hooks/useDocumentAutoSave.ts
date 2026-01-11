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
}

/**
 * 문서 자동 저장 로직을 담당하는 커스텀 훅
 * - 디바운스된 자동 저장
 * - 저장 상태 관리 (saved/saving/error/unsaved)
 * - 컴포넌트 언마운트 시 저장
 * - 문서 전환 시 이전 문서 저장
 */
export function useDocumentAutoSave(
    currentDocument: Document | null,
    title: string,
    content: string,
    options: UseDocumentAutoSaveOptions
): UseDocumentAutoSaveReturn {
    const { debounceMs = 500, canWrite, isReadOnly } = options;

    const { updateDocument } = useDocument();

    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const prevDocumentRef = useRef<Document | undefined>(undefined);

    // 최신 값을 참조하기 위한 ref
    const titleRef = useRef<string>(title);
    const contentRef = useRef<string>(content);

    // ref 동기화
    useEffect(() => {
        titleRef.current = title;
    }, [title]);

    useEffect(() => {
        contentRef.current = content;
    }, [content]);

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
            return;
        }

        try {
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
            }
        }
    }, [currentDocument, canWrite, isReadOnly, updateDocument]);

    // 자동 저장 트리거 (디바운스)
    const triggerAutoSave = useCallback(() => {
        // 권한이 없으면 자동 저장하지 않음
        if (!canWrite || isReadOnly) {
            return;
        }

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            handleSave();
        }, debounceMs);
    }, [canWrite, isReadOnly, handleSave, debounceMs]);

    // 컴포넌트 언마운트 시 저장
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
            // 언마운트 시점에 handleSave 호출
            // Note: 이 시점에서 handleSave를 호출하면 비동기 작업이 완료되지 않을 수 있음
            // 하지만 기존 동작을 유지하기 위해 그대로 둠
            handleSave();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 문서 전환 시 이전 문서 저장
    useEffect(() => {
        if (
            prevDocumentRef.current &&
            saveStatus === 'unsaved' &&
            prevDocumentRef.current.id !== currentDocument?.id
        ) {
            updateDocument(prevDocumentRef.current.id, {
                title: titleRef.current,
                content: contentRef.current,
            });
        }
        prevDocumentRef.current = currentDocument ?? undefined;
    }, [currentDocument, saveStatus, updateDocument]);

    return {
        saveStatus,
        setSaveStatus,
        triggerAutoSave,
        handleSave,
        titleRef,
        contentRef,
    };
}

export default useDocumentAutoSave;
