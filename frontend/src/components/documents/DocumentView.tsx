// src/components/documents/DocumentView.tsx
/**
 * 문서 뷰 컨테이너 컴포넌트
 * - URL 라우팅 기반 문서 표시
 * - PAGE / TABLE / GALLERY 뷰 타입 분기
 * 
 * 리팩토링: 커스텀 훅으로 로직 분리
 * @see https://github.com/dschoi30/notion-clone/issues/112
 * @see https://github.com/dschoi30/notion-clone/issues/113
 */
import { useRef, useMemo, KeyboardEvent, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useDocument } from '@/contexts/DocumentContext';
import { useUIStore } from '@/stores/uiStore';
import { useShallow } from 'zustand/react/shallow';
import useDocumentPresence from '@/hooks/useDocumentPresence';
import { useToast } from '@/hooks/useToast';

// Phase 1: 분리된 커스텀 훅들
import { useDocumentRouting } from '@/hooks/useDocumentRouting';
import { useDocumentAutoSave } from '@/hooks/useDocumentAutoSave';
import { useDocumentVersioning } from '@/hooks/useDocumentVersioning';
import { useDocumentEditing } from '@/hooks/useDocumentEditing';

import { hasWritePermission } from '@/utils/permissionUtils';
import DocumentTableView from './DocumentTableView';
import DocumentHeader from './DocumentHeader';
import DocumentPageView, { DocumentPageViewRef } from './DocumentPageView';
import type { ViewType } from '@/types';

const DocumentView = () => {
    const { currentWorkspace } = useWorkspace();
    const { user } = useAuth();
    const { toast } = useToast();

    // DocumentContext에서 상태 가져오기
    const { currentDocument, updateDocument, documentLoading } = useDocument();

    // UI Store
    const { showShareModal, setShowShareModal } = useUIStore(
        useShallow((state) => ({
            showShareModal: state.showShareModal,
            setShowShareModal: state.setShowShareModal
        }))
    );

    // Refs
    const shareButtonRef = useRef<HTMLButtonElement>(null);
    const editorRef = useRef<{ focus: () => void } | null>(null);
    const pageViewRef = useRef<DocumentPageViewRef | null>(null);

    // 제목/내용 ref (useDocumentEditing에서 관리, useDocumentAutoSave에 전달)
    const titleRef = useRef<string>('');
    const contentRef = useRef<string>('');

    // 권한 계산
    const canWrite = hasWritePermission(currentDocument, user);
    const isReadOnly = useMemo(() => {
        return !canWrite || (currentDocument?.isLocked ?? false);
    }, [canWrite, currentDocument?.isLocked]);

    // 실시간 접속자
    const viewers = useDocumentPresence(currentDocument?.id, user);

    // 에러 콜백
    const handleSaveError = useCallback((message: string) => {
        toast({
            title: '저장 오류',
            description: message,
            variant: 'destructive',
        });
    }, [toast]);

    const handleConnectionError = useCallback((message: string) => {
        toast({
            title: '연결 오류',
            description: message,
            variant: 'destructive',
        });
    }, [toast]);

    // ========================================
    // Phase 1: 커스텀 훅 사용
    // ========================================

    // 1. 라우팅 훅
    const { path, handlePathClick } = useDocumentRouting();

    // 2. 자동 저장 훅 (ref만 전달 - 순환 의존성 해결)
    const {
        saveStatus,
        setSaveStatus,
        triggerAutoSave,
        handleSave,
        isSaving,
    } = useDocumentAutoSave(currentDocument, titleRef, contentRef, {
        canWrite,
        isReadOnly,
        onSaveError: handleSaveError,
    });

    // 3. 편집 훅 (자동 저장과 연동, 같은 ref 공유)
    const {
        title,
        content,
        handleTitleChange,
        handleContentChange,
        connectionStatus,
    } = useDocumentEditing(currentDocument, {
        triggerAutoSave,
        setSaveStatus,
        titleRef,
        contentRef,
        onConnectionError: handleConnectionError,
    });

    // 4. 버전 스냅샷 훅
    useDocumentVersioning(currentDocument, currentWorkspace, titleRef, contentRef, {
        onError: handleSaveError,
    });

    // ========================================
    // 핸들러
    // ========================================

    const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (editorRef.current && typeof editorRef.current.focus === 'function') {
                editorRef.current.focus();
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            if (pageViewRef.current && typeof pageViewRef.current.focusFirstProperty === 'function') {
                pageViewRef.current.focusFirstProperty();
            }
        }
    };

    // viewType 변경 핸들러
    const handleChangeViewType = async (type: ViewType) => {
        if (!currentDocument) return;
        await handleSave();
        await updateDocument(currentDocument.id, { viewType: type });
    };

    // 최초 생성 상태 판별
    const isInitial =
        currentDocument &&
        (!currentDocument.content || currentDocument.content.trim() === '') &&
        currentDocument.viewType === 'PAGE';

    // 잠금 토글 핸들러
    const handleLockToggle = async () => {
        if (!currentDocument || !currentWorkspace) return;
        try {
            const newLockState = !currentDocument.isLocked;
            await updateDocument(currentDocument.id, {
                isLocked: newLockState,
                title: titleRef.current || currentDocument.title || '',
                content: contentRef.current || currentDocument.content || ''
            });
        } catch (error) {
            console.error('잠금 상태 변경 실패:', error);
            toast({
                title: '잠금 상태 변경 실패',
                description: '문서 잠금 상태를 변경할 수 없습니다.',
                variant: 'destructive',
            });
        }
    };

    // ========================================
    // 렌더링
    // ========================================

    if (!currentDocument) {
        return (
            <div role="status" aria-live="polite" className="p-4 text-sm text-gray-500">
                선택된 문서가 없습니다.
            </div>
        );
    }

    if (!currentWorkspace) {
        return (
            <div role="status" aria-live="polite" className="p-4 text-sm text-gray-500">
                <span className="animate-pulse">워크스페이스를 불러오는 중...</span>
            </div>
        );
    }

    if (documentLoading) {
        return (
            <div role="status" aria-live="polite" aria-busy="true" className="p-4 text-sm text-gray-500">
                <span className="animate-pulse">문서 불러오는 중...</span>
            </div>
        );
    }

    return (
        <main
            className="overflow-x-visible relative bg-white"
            aria-label={`문서: ${title || '제목 없음'}`}
        >
            {/* 저장 중 오버레이 */}
            {isSaving && (
                <div
                    className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center"
                    role="alert"
                    aria-live="assertive"
                >
                    <span className="text-sm text-gray-600 animate-pulse">저장 중...</span>
                </div>
            )}

            <div className="px-4 pt-4 pb-40 space-y-4 min-w-0">
                {/* 상단 타이틀/공유/저장 상태/권한자 이니셜 */}
                <DocumentHeader
                    title={title}
                    onTitleChange={handleTitleChange}
                    onTitleKeyDown={handleTitleKeyDown}
                    saveStatus={saveStatus}
                    isReadOnly={isReadOnly}
                    showShareModal={showShareModal}
                    setShowShareModal={setShowShareModal}
                    shareButtonRef={shareButtonRef}
                    currentDocument={currentDocument}
                    viewers={viewers}
                    currentWorkspace={currentWorkspace}
                    path={path}
                    onPathClick={handlePathClick}
                    onLockToggle={handleLockToggle}
                    connectionStatus={connectionStatus}
                />
                {currentDocument.viewType === 'PAGE' && (
                    <DocumentPageView
                        ref={pageViewRef}
                        content={content}
                        handleContentChange={handleContentChange}
                        editorRef={editorRef}
                        isReadOnly={isReadOnly}
                        isInitial={!!isInitial}
                        handleChangeViewType={handleChangeViewType}
                    />
                )}
                {currentDocument.viewType === 'TABLE' && (
                    <DocumentTableView
                        workspaceId={currentWorkspace.id}
                        documentId={currentDocument.id}
                        isReadOnly={isReadOnly}
                    />
                )}
                {currentDocument.viewType === 'GALLERY' && (
                    <div
                        className="p-4 text-gray-500"
                        role="status"
                    >
                        갤러리 뷰는 아직 구현되지 않았습니다.
                    </div>
                )}
            </div>
        </main>
    );
};

export default DocumentView;
