/**
 * useDocumentEditing.ts
 * 문서 제목/내용 상태 관리 및 WebSocket 실시간 편집 통합 훅
 * 
 * @see https://github.com/dschoi30/notion-clone/issues/112
 */
import { useState, useEffect, useCallback, useRef, useMemo, ChangeEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import useDocumentSocket from '@/hooks/useDocumentSocket';
import { useDocumentPropertiesStore } from '@/hooks/useDocumentPropertiesStore';
import { createLogger } from '@/lib/logger';
import type { Document } from '@/types';
import type { RemoteEditMessage } from '@/types/document';
import type { SaveStatus } from './useDocumentAutoSave';

const rlog = createLogger('editing');

interface UseDocumentEditingOptions {
    /** 자동 저장 트리거 함수 */
    triggerAutoSave: () => void;
    /** 저장 상태 setter */
    setSaveStatus: React.Dispatch<React.SetStateAction<SaveStatus>>;
    /** 제목 ref (최신 값 참조용) */
    titleRef: React.MutableRefObject<string>;
    /** 내용 ref (최신 값 참조용) */
    contentRef: React.MutableRefObject<string>;
}

interface UseDocumentEditingReturn {
    /** 현재 제목 */
    title: string;
    /** 제목 setter */
    setTitle: React.Dispatch<React.SetStateAction<string>>;
    /** 현재 내용 */
    content: string;
    /** 내용 setter */
    setContent: React.Dispatch<React.SetStateAction<string>>;
    /** 제목 변경 핸들러 */
    handleTitleChange: (e: ChangeEvent<HTMLInputElement>) => void;
    /** 내용 변경 핸들러 */
    handleContentChange: (newContent: string) => void;
    /** WebSocket 편집 메시지 전송 함수 */
    sendEdit: (editData: RemoteEditMessage) => void;
    /** 메모이제이션된 문서 ID */
    documentId: number | undefined;
}

/**
 * 문서 편집 상태 및 실시간 협업 로직을 담당하는 커스텀 훅
 * - 제목/내용 로컬 상태 관리
 * - WebSocket을 통한 실시간 협업
 * - 원격 편집 수신 및 로컬 상태 동기화
 */
export function useDocumentEditing(
    currentDocument: Document | null,
    options: UseDocumentEditingOptions
): UseDocumentEditingReturn {
    const { triggerAutoSave, setSaveStatus, titleRef, contentRef } = options;

    const { user } = useAuth();
    const location = useLocation();
    const setTitleWidth = useDocumentPropertiesStore(state => state.setTitleWidth);

    // 로컬 상태
    const [title, setTitle] = useState<string>('');
    const [content, setContent] = useState<string>('');

    // 안정적인 참조를 위한 ref
    const userRef = useRef(user);

    // currentDocument?.id를 메모이제이션하여 불필요한 재연결 방지
    const documentId = useMemo(() => currentDocument?.id, [currentDocument?.id]);
    const documentIdRef = useRef(documentId);

    // ref 동기화
    useEffect(() => {
        userRef.current = user;
        documentIdRef.current = documentId;
    }, [user, documentId]);

    // currentDocument가 변경될 때 로컬 상태 동기화
    useEffect(() => {
        if (currentDocument) {
            setTitle(currentDocument.title);
            setContent(currentDocument.content || '');

            // titleColumnWidth를 store에 동기화
            if (currentDocument.titleColumnWidth) {
                setTitleWidth(currentDocument.titleColumnWidth);
            }
        }
    }, [currentDocument, setTitleWidth]);

    // 원격 편집 수신 핸들러
    const handleRemoteEdit = useCallback((msg: RemoteEditMessage) => {
        // 자신이 보낸 에코 메시지는 무시
        if (msg?.userId && userRef.current?.id && String(msg.userId) === String(userRef.current.id)) {
            return;
        }

        rlog.debug('remoteEdit', {
            docId: documentIdRef.current,
            length: msg?.content?.length,
        });

        // contentRef를 사용하여 최신 값을 참조
        if (typeof msg?.content === 'string' && msg.content !== contentRef.current) {
            setContent(msg.content);
        }
    }, [contentRef]);

    // WebSocket 연결
    const { sendEdit } = useDocumentSocket(documentId, handleRemoteEdit);

    // 제목 변경 핸들러
    const handleTitleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        titleRef.current = newTitle;
        setSaveStatus('unsaved');
        triggerAutoSave();
    }, [setSaveStatus, triggerAutoSave]);

    // 내용 변경 핸들러
    const handleContentChange = useCallback((newContent: string) => {
        setContent(newContent);
        contentRef.current = newContent;
        setSaveStatus('unsaved');
        triggerAutoSave();

        // 실시간 편집 메시지 전송
        rlog.debug('sendEdit', {
            docId: currentDocument?.id,
            length: newContent?.length,
            path: location.pathname,
        });
        sendEdit({ content: newContent, userId: user?.id });
    }, [setSaveStatus, triggerAutoSave, currentDocument?.id, location.pathname, sendEdit, user?.id]);

    // title, content가 변경될 때 ref 동기화 (외부에서 직접 set한 경우 대비)
    useEffect(() => {
        titleRef.current = title;
    }, [title]);

    useEffect(() => {
        contentRef.current = content;
    }, [content]);

    return {
        title,
        setTitle,
        content,
        setContent,
        handleTitleChange,
        handleContentChange,
        sendEdit,
        documentId,
    };
}

export default useDocumentEditing;
