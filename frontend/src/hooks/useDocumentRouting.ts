/**
 * useDocumentRouting.ts
 * URL 파라미터 파싱, 라우팅, 문서 선택 동기화 로직을 담당하는 커스텀 훅
 * 
 * @see https://github.com/dschoi30/notion-clone/issues/112
 */
import { useEffect, useMemo, useRef } from 'react';
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

    let idStr: string | null = null;

    const match = idSlug.match(/^(\d+)-(.+)$/);
    if (match) {
        idStr = match[1];
    } else if (/^\d+$/.test(idSlug)) {
        idStr = idSlug;
    }

    // ID 유효성 검증: 숫자 범위 체크
    if (idStr) {
        const id = parseInt(idStr, 10);
        if (isNaN(id) || id < 1 || id > Number.MAX_SAFE_INTEGER) {
            return null;
        }
    }

    return idStr;
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

    // selectDocument를 ref로 저장하여 함수 참조 변경으로 인한 effect 재실행 방지
    const selectDocumentRef = useRef(selectDocument);
    useEffect(() => {
        selectDocumentRef.current = selectDocument;
    }, [selectDocument]);

    // currentDocument를 ref로 저장하여 effect 재실행 방지 (needsSelect 체크용)
    const currentDocumentRef = useRef(currentDocument);
    useEffect(() => {
        currentDocumentRef.current = currentDocument;
    }, [currentDocument]);

    // idSlug에서 문서 ID 파싱
    const docId = useMemo(() => parseDocIdFromSlug(idSlug), [idSlug]);

    // 현재 문서의 계층 경로 계산
    const path = useMemo(() => {
        if (!currentDocument || !documents) return [];
        return getDocumentPath(currentDocument.id, documents, currentDocument);
    }, [currentDocument, documents]);

    // currentDocument가 변경될 때 URL slug 동기화
    // 주의: 문서 ID가 다른 경우에는 navigate하지 않음 (idSlug effect가 문서 선택을 처리함)
    useEffect(() => {
        if (!enableUrlSync) return;
        if (!currentDocument || !currentWorkspace) return;

        const expectedPath = `/${currentDocument.id}-${slugify(currentDocument.title)}`;
        const currentPath = location.pathname;

        // URL의 문서 ID는 같지만 slug가 다른 경우에만 동기화
        const currentUrlDocId = currentPath.match(/^\/(\d+)(-.*)?$/)?.[1];
        const isSameDocId = String(currentUrlDocId) === String(currentDocument.id);

        // 같은 문서인데 slug만 다른 경우: slug 동기화
        if (isSameDocId && currentPath !== expectedPath) {
            rlog.debug('slug sync', { from: currentPath, to: expectedPath });
            navigate(expectedPath, { replace: true });
        }
        // 다른 문서인 경우: idSlug effect가 selectDocument를 호출할 것이므로 여기서는 아무것도 하지 않음
    }, [currentDocument, currentWorkspace, enableUrlSync, navigate, location.pathname]);

    // idSlug가 바뀔 때마다 해당 id의 문서를 선택
    useEffect(() => {
        if (!docId || !currentWorkspace) return;

        // ref에서 현재 문서 가져오기 (의존성 배열에서 제외하기 위함)
        const currDoc = currentDocumentRef.current;

        // 워크스페이스 변경 시 현재 문서의 워크스페이스 ID 확인
        if (currDoc?.workspaceId) {
            const docWorkspaceId = String(currDoc.workspaceId);
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

        const needsSelect = !currDoc || String(currDoc.id) !== String(docId);
        const reason = needsSelect ? (found ? 'found' : 'byId') : 'noop';
        // noop은 debug, 실제 선택 시에만 info
        if (reason === 'noop') {
            rlog.debug('idSlug select check', { docId, currentId: currDoc?.id, reason });
        } else {
            rlog.info('idSlug select check', { docId, reason });
        }

        if (needsSelect) {
            rlog.info('selectDocument', { id: found ? found.id : Number(docId), src: 'idSlugEffect' });
            selectDocumentRef.current(
                found ? found : { id: Number(docId) } as Document,
                { source: 'idSlugEffect' }
            );
        }
    }, [docId, documents, currentWorkspace, navigate, location.pathname]);

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
