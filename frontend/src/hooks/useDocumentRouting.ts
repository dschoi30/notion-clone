/**
 * useDocumentRouting.ts
 * URL 파라미터 파싱, 라우팅, 문서 선택 동기화 로직을 담당하는 커스텀 훅
 * 
 * @see https://github.com/dschoi30/notion-clone/issues/112
 */
import { useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDocument } from '@/contexts/DocumentContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { slugify } from '@/lib/utils';
import { createLogger } from '@/lib/logger';
import type { Document } from '@/types';

const rlog = createLogger('router');

/**
 * idSlug에서 문서 ID를 추출하는 유틸리티 함수
 * @param idSlug - URL의 idSlug 파라미터 (예: "123-document-title" 또는 "123")
 * @returns 문서 ID 문자열 또는 null
 */
export function parseDocIdFromSlug(idSlug?: string): string | null {
    if (!idSlug) return null;

    const match = idSlug.match(/^(\d+)-(.+)$/);
    if (match) {
        return match[1];
    } else if (/^\d+$/.test(idSlug)) {
        return idSlug;
    }
    return null;
}

/**
 * 문서 ID로부터 계층 경로를 계산하는 유틸리티 함수
 * @param documentId - 대상 문서 ID
 * @param documentList - 전체 문서 목록
 * @param currentDocument - 현재 선택된 문서 (목록에 없는 경우 fallback)
 * @returns 루트부터 해당 문서까지의 경로 배열
 */
export function getDocumentPath(
    documentId: number,
    documentList: Document[],
    currentDocument?: Document | null
): Document[] {
    const path: Document[] = [];
    let doc = documentList.find(d => String(d.id) === String(documentId));

    // 목록에 없으면 currentDocument를 fallback으로 사용
    if (!doc && currentDocument && String(currentDocument.id) === String(documentId)) {
        doc = currentDocument;
    }

    while (doc) {
        path.unshift(doc);
        if (!doc.parentId) break;
        const parent = documentList.find(d => String(d.id) === String(doc!.parentId));
        if (!parent) break;
        doc = parent;
    }

    return path;
}

interface UseDocumentRoutingOptions {
    /** URL 동기화 자동 활성화 여부 (기본값: true) */
    enableUrlSync?: boolean;
}

interface UseDocumentRoutingReturn {
    /** URL에서 파싱된 문서 ID */
    docId: string | null;
    /** 현재 문서의 계층 경로 */
    path: Document[];
    /** 경로 상의 문서 클릭 핸들러 */
    handlePathClick: (docId: number) => void;
}

/**
 * 문서 라우팅 관련 로직을 담당하는 커스텀 훅
 * - URL 파라미터에서 문서 ID 파싱
 * - URL ↔ 문서 상태 동기화
 * - 문서 경로 계산
 */
export function useDocumentRouting(
    options: UseDocumentRoutingOptions = {}
): UseDocumentRoutingReturn {
    const { enableUrlSync = true } = options;

    const navigate = useNavigate();
    const location = useLocation();
    const { idSlug } = useParams<{ idSlug?: string }>();

    const { currentWorkspace } = useWorkspace();
    const { currentDocument, documents, selectDocument } = useDocument();

    // idSlug에서 문서 ID 파싱
    const docId = useMemo(() => parseDocIdFromSlug(idSlug), [idSlug]);

    // 현재 문서의 계층 경로 계산
    const path = useMemo(() => {
        if (!currentDocument || !documents) return [];
        return getDocumentPath(currentDocument.id, documents, currentDocument);
    }, [currentDocument, documents]);

    // currentDocument가 변경될 때 URL 동기화
    useEffect(() => {
        if (!enableUrlSync) return;
        if (!currentDocument || !currentWorkspace) return;

        const expectedPath = `/${currentDocument.id}-${slugify(currentDocument.title)}`;
        const currentPath = location.pathname;

        // URL의 문서 ID는 같지만 slug가 다른 경우에만 동기화
        const currentUrlDocId = currentPath.match(/^\/(\d+)(-.*)?$/)?.[1];
        const isSameDocId = String(currentUrlDocId) === String(currentDocument.id);

        if (isSameDocId && currentPath !== expectedPath) {
            rlog.debug('slug sync', { from: currentPath, to: expectedPath });
            navigate(expectedPath, { replace: true });
        } else if (!isSameDocId) {
            rlog.info('doc change navigate', { from: currentPath, to: expectedPath });
            navigate(expectedPath, { replace: true });
        }
    }, [currentDocument, currentWorkspace, enableUrlSync, navigate, location.pathname]);

    // idSlug가 바뀔 때마다 해당 id의 문서를 선택
    useEffect(() => {
        if (!docId || !currentWorkspace) return;

        // 워크스페이스 변경 시 현재 문서의 워크스페이스 ID 확인
        if (currentDocument?.workspaceId) {
            const docWorkspaceId = String(currentDocument.workspaceId);
            const currentWorkspaceId = String(currentWorkspace.id);
            if (docWorkspaceId !== currentWorkspaceId) {
                rlog.warn('idSlug select blocked: 문서가 다른 워크스페이스에 속함', {
                    docId,
                    docWorkspaceId,
                    currentWorkspaceId,
                });
                navigate('/', { replace: true });
                return;
            }
        }

        const found = documents.find(doc => String(doc.id) === String(docId));

        // 문서 목록에 있는 경우, 해당 문서의 워크스페이스 ID 확인
        if (found?.workspaceId) {
            const docWorkspaceId = String(found.workspaceId);
            const currentWorkspaceId = String(currentWorkspace.id);
            if (docWorkspaceId !== currentWorkspaceId) {
                rlog.warn('idSlug select blocked: 문서가 다른 워크스페이스에 속함', {
                    docId,
                    docWorkspaceId,
                    currentWorkspaceId,
                });
                navigate('/', { replace: true });
                return;
            }
        }

        // 문서 목록에 없는 경우 로그
        if (!found && documents.length > 0) {
            rlog.warn('idSlug select: 문서 목록에 없음 (자식 문서 등 접근 가능한 경우 허용)', {
                docId,
                workspaceId: currentWorkspace.id,
            });
        }

        const needsSelect = !currentDocument || String(currentDocument.id) !== String(docId);
        const reason = needsSelect ? (found ? 'found' : 'byId') : 'noop';
        rlog.info('idSlug select check', { docId, currentId: currentDocument?.id, reason });

        if (needsSelect) {
            rlog.info('selectDocument', { id: found ? found.id : Number(docId), src: 'idSlugEffect' });
            selectDocument(
                found ? found : { id: Number(docId) } as Document,
                { source: 'idSlugEffect' }
            );
        }
    }, [docId, documents, currentWorkspace, currentDocument, navigate, selectDocument, location.pathname]);

    // 경로 클릭 핸들러
    const handlePathClick = (targetDocId: number) => {
        if (!targetDocId) return;

        try {
            const targetDoc = documents.find(d => d.id === targetDocId);
            if (targetDoc) {
                navigate(`/${targetDocId}-${slugify(targetDoc.title || '제목 없음')}`);
            } else if (currentDocument && String(currentDocument.id) === String(targetDocId)) {
                navigate(`/${targetDocId}-${slugify(currentDocument.title || '제목 없음')}`);
            } else {
                navigate(`/${targetDocId}`);
            }
        } catch (err) {
            console.error('경로 클릭 문서 이동 실패:', err);
        }
    };

    return {
        docId,
        path,
        handlePathClick,
    };
}

export default useDocumentRouting;
