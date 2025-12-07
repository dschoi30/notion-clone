// src/components/documents/DocumentEditor.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useDocument } from '@/contexts/DocumentContext';
import { useUIStore } from '@/stores/uiStore';
import { useShallow } from 'zustand/react/shallow';
import useDocumentSocket from '@/hooks/useDocumentSocket';
import useDocumentPresence from '@/hooks/useDocumentPresence';
import { useDocumentPropertiesStore } from '@/hooks/useDocumentPropertiesStore';
import { getProperties, getPropertyValuesByDocument } from '@/services/documentApi';
import { slugify } from '@/lib/utils';
import DocumentTableView from './DocumentTableView';
import usePageStayTimer from '@/hooks/usePageStayTimer';
import { createLogger } from '@/lib/logger';
import { createDocumentVersion } from '@/services/documentApi';
import DocumentHeader from './DocumentHeader';
import DocumentPageView from './DocumentPageView';
import { hasWritePermission } from '@/utils/permissionUtils';

const DocumentEditor = () => {
  const vlog = createLogger('version');
  const rlog = createLogger('router');
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // useDocument()에서 currentDocument를 가져와서 단일 진실 공급원(Single Source of Truth) 유지
  const { currentDocument, updateDocument, documentLoading, documents, selectDocument } = useDocument();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const debounceTimer = useRef(null);
  const prevDocumentRef = useRef();
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const editorRef = useRef(null);
  const pageViewRef = useRef(null);

  // 공유 팝오버 상태 (zustand store에서 관리)
  const { showShareModal, setShowShareModal } = useUIStore(
    useShallow((state) => ({
      showShareModal: state.showShareModal,
      setShowShareModal: state.setShowShareModal
    }))
  );
  const shareButtonRef = useRef(null);
  const canWrite = hasWritePermission(currentDocument, user);
  // 잠금 상태 또는 권한이 없으면 읽기 전용
  // useMemo로 감싸서 currentDocument?.isLocked 변경 시 즉시 재계산되도록 보장
  const isReadOnly = useMemo(() => {
    return !canWrite || (currentDocument?.isLocked ?? false);
  }, [canWrite, currentDocument?.isLocked]);
  const viewers = useDocumentPresence(currentDocument?.id, user);
  const { properties, titleWidth } = useDocumentPropertiesStore(state => ({ properties: state.properties, titleWidth: state.titleWidth }));
  const SNAPSHOT_INTERVAL_MS = (import.meta.env && import.meta.env.MODE === 'development') ? 30 * 1000 : 10 * 60 * 1000;
  const [nextSnapshotMs, setNextSnapshotMs] = useState(SNAPSHOT_INTERVAL_MS);

  const handleReachTenMinutes = async (reachedMs) => {
    try {
      if (!currentDocument || !currentWorkspace) return;
      // 최신 속성/값을 병렬로 로드
      const [props, valuesArr] = await Promise.all([
        getProperties(currentWorkspace.id, currentDocument.id),
        getPropertyValuesByDocument(currentWorkspace.id, currentDocument.id),
      ]);
      const propsSlim = (props || []).map(p => ({ id: p.id, name: p.name, type: p.type, sortOrder: p.sortOrder, width: p.width }));
      const valuesObj = {};
      (valuesArr || []).forEach(v => { valuesObj[v.propertyId] = v.value; });

      const payload = {
        title: titleRef.current || '',
        viewType: currentDocument.viewType,
        titleWidth: titleWidth,
        content: currentDocument.viewType === 'PAGE' ? (contentRef.current || '') : null,
        propertiesJson: JSON.stringify(propsSlim),
        propertyValuesJson: JSON.stringify(valuesObj),
      };
      vlog.debug('create payload', payload);
      const res = await createDocumentVersion(currentWorkspace.id, currentDocument.id, payload);
      vlog.info('created version id', res);
    } catch (e) {
      vlog.error('create failed', e);
    } finally {
      // 다음 임계치: 방금 도달 지점 기준으로 재설정하고, 즉시 타이머 시작 유도
      const base = typeof reachedMs === 'number' ? reachedMs : 0;
      const next = base + SNAPSHOT_INTERVAL_MS;
      setNextSnapshotMs(next);
      vlog.debug('next target set', next);
    }
  };

  const isTimerEnabled = Boolean(currentDocument);
  const { elapsedMs } = usePageStayTimer({ enabled: isTimerEnabled, onReachMs: handleReachTenMinutes, targetMs: nextSnapshotMs });

  const { idSlug } = useParams();
  
  // zustand store에서 titleWidth 관리
  const setTitleWidth = useDocumentPropertiesStore(state => state.setTitleWidth);

  // idSlug에서 id와 slug 분리
  let docId = null;
  if (idSlug) {
    const match = idSlug.match(/^(\d+)-(.+)$/);
    if (match) {
      docId = match[1];
    } else if (/^\d+$/.test(idSlug)) {
      docId = idSlug;
    }
  }

  // currentDocument가 변경될 때 URL 동기화 (의존성 최적화로 무한 루프 방지)
  useEffect(() => {
    if (currentDocument && currentWorkspace) {
      const expectedPath = `/${currentDocument.id}-${slugify(currentDocument.title)}`;
      const currentPath = location.pathname;
      
      // URL의 문서 ID는 같지만 slug가 다른 경우에만 동기화 (무한 루프 방지)
      const currentUrlDocId = currentPath.match(/^\/(\d+)(-.*)?$/)?.[1];
      const isSameDocId = String(currentUrlDocId) === String(currentDocument.id);
      
      if (isSameDocId && currentPath !== expectedPath) {
        rlog.debug('slug sync', { from: currentPath, to: expectedPath });
        navigate(expectedPath, { replace: true });
      } else if (!isSameDocId) {
        // 완전히 다른 문서인 경우 (사이드바에서 선택한 경우)
        rlog.info('doc change navigate', { from: currentPath, to: expectedPath });
        navigate(expectedPath, { replace: true });
      }
    }
  }, [currentDocument, currentWorkspace]); // location.pathname 의존성 제거로 무한 루프 방지

  // idSlug가 바뀔 때마다 해당 id의 문서를 선택
  useEffect(() => {
    if (!docId || !currentWorkspace) return;
    
    // 워크스페이스 변경 시 현재 문서의 워크스페이스 ID 확인
    if (currentDocument && currentDocument.workspaceId) {
      const docWorkspaceId = String(currentDocument.workspaceId);
      const currentWorkspaceId = String(currentWorkspace.id);
      if (docWorkspaceId !== currentWorkspaceId) {
        rlog.warn('idSlug select blocked: 문서가 다른 워크스페이스에 속함', {
          docId,
          docWorkspaceId,
          currentWorkspaceId,
        });
        // 다른 워크스페이스 문서면 홈으로 리다이렉트
        navigate('/', { replace: true });
        return;
      }
    }
    
    const found = documents.find(doc => String(doc.id) === String(docId));
    
    // 문서 목록에 있는 경우, 해당 문서의 워크스페이스 ID 확인
    if (found && found.workspaceId) {
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
    
    // 문서 목록에 없고, 워크스페이스가 변경된 직후인 경우 홈으로 리다이렉트
    // (자식 문서 등 접근 가능한 경우를 위해 완전히 차단하지는 않음)
    if (!found && documents.length > 0) {
      // 문서 목록이 로드되었는데 해당 문서가 없으면 다른 워크스페이스 문서일 가능성이 높음
      // 하지만 자식 문서 등 접근 가능한 경우도 있으므로, selectDocument 내부에서 검증하도록 함
      rlog.warn('idSlug select: 문서 목록에 없음 (자식 문서 등 접근 가능한 경우 허용)', {
        docId,
        workspaceId: currentWorkspace.id,
      });
    }
    
    const needsSelect = !currentDocument || String(currentDocument.id) !== String(docId);
    const reason = needsSelect ? (found ? 'found' : 'byId') : 'noop';
    rlog.info('idSlug select check', { docId, currentId: currentDocument?.id, reason });
    if (needsSelect) {
      // URL 가드: 현재 경로의 id와만 동작
      const urlDocId = location.pathname.match(/^\/(\d+)(?:-.+)?$/)?.[1];
      if (urlDocId && String(urlDocId) !== String(docId)) {
        rlog.warn('idSlug select blocked by URL guard', { docId, urlDocId });
        return;
      }
      rlog.info('selectDocument', { id: found ? found.id : Number(docId), src: 'idSlugEffect' });
      selectDocument(found ? found : { id: Number(docId) }, { source: 'idSlugEffect' }); // 문서 목록에 없더라도(부모 권한으로 접근 가능한 자식 등) 단건 조회로 진입 허용
    }
      
  }, [docId, documents, currentWorkspace, currentDocument, navigate, selectDocument, location.pathname]);

  // 경로 계산 유틸: 목록에 없더라도 currentDocument로 최소 1단계 표시
  function getDocumentPath(documentId, documentList) {
    const path = [];
    let doc = documentList.find(d => String(d.id) === String(documentId));
    if (!doc && currentDocument && String(currentDocument.id) === String(documentId)) {
      doc = currentDocument;
    }
    while (doc) {
      path.unshift(doc);
      if (!doc.parentId) break;
      const parent = documentList.find(d => String(d.id) === String(doc.parentId));
      if (!parent) break; // 부모가 목록에 없으면 여기까지 표시
      doc = parent;
    }
    return path;
  }

  const path = currentDocument && documents ? getDocumentPath(currentDocument.id, documents) : [];

  // (removed) PAGE에서 부모 속성 선반영 로직은 Page 훅에서 일괄 처리

  useEffect(() => {
    if (currentDocument) {
      setTitle(currentDocument.title);
      setContent(currentDocument.content || '');
      // titleColumnWidth를 store에 동기화
      if (currentDocument.titleWidth) {
        setTitleWidth(currentDocument.titleWidth);
      }
    }
  }, [currentDocument, setTitleWidth]);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { contentRef.current = content; }, [content]);

  // 자동 저장 트리거 함수
  const triggerAutoSave = () => {
    // 권한이 없으면 자동 저장하지 않음
    if (!canWrite || isReadOnly) {
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      handleSave();
    }, 500);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    setSaveStatus('unsaved');
    triggerAutoSave();
  };

  const handleContentChange = (newContent) => {
    setContent(newContent);
    setSaveStatus('unsaved');
    triggerAutoSave();
    // 현재 로그인 사용자 기준으로 송신자 식별, 자기 자신 에코 무시 용도
    rlog.debug('sendEdit', { docId: currentDocument?.id, length: newContent?.length, path: location.pathname });
    sendEdit({ content: newContent, userId: user?.id });
  };

  const handleRemoteEdit = (msg) => {
    // 자신이 보낸 에코 메시지는 무시
    if (msg?.userId && user?.id && String(msg.userId) === String(user.id)) {
      return;
    }
    rlog.debug('remoteEdit', { docId: currentDocument?.id, length: msg?.content?.length, path: location.pathname });
    if (typeof msg?.content === 'string' && msg.content !== content) {
      setContent(msg.content);
    }
  };
  const { sendEdit } = useDocumentSocket(currentDocument?.id, handleRemoteEdit);

  const handleSave = async () => {
    if (!currentDocument) return;
    
    // 권한 체크: 쓰기 권한이 없으면 저장하지 않음
    if (!canWrite || isReadOnly) {
      rlog.warn('문서 저장 실패: 권한 없음', { 
        documentId: currentDocument.id, 
        canWrite, 
        isReadOnly 
      });
      setSaveStatus('error');
      return;
    }
    
    try {
      setSaveStatus('saving');
      rlog.info('updateDocument(save)', { id: currentDocument.id });
      await updateDocument(currentDocument.id, {
        title: titleRef.current || '',
        content: contentRef.current,
      });
      setSaveStatus('saved');
    } catch (error) {
      console.error('문서 저장 실패:', error);
      setSaveStatus('error');
      // 403 에러인 경우 추가 로깅
      if (error?.response?.status === 403) {
        rlog.error('문서 저장 실패: 권한 없음 (403)', { 
          documentId: currentDocument.id,
          error: error.message 
        });
      }
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      handleSave();
    };
  }, []);

  // currentDocument가 변경될 때 마지막 변경 내용 저장
  useEffect(() => {
    if (
      prevDocumentRef.current &&
      saveStatus === 'unsaved' &&
      prevDocumentRef.current.id !== currentDocument?.id
    ) {
      updateDocument(prevDocumentRef.current.id, { title, content });
    }
    prevDocumentRef.current = currentDocument;
  }, [currentDocument]);

  // 문서 전환 시 임계치를 현재 누적+간격으로 재설정
  useEffect(() => {
    setNextSnapshotMs(elapsedMs + SNAPSHOT_INTERVAL_MS);
  }, [docId]);

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editorRef.current && typeof editorRef.current.focus === 'function') {
        editorRef.current.focus();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Tab 키로 첫 번째 속성으로 이동하는 함수 호출
      if (pageViewRef.current && typeof pageViewRef.current.focusFirstProperty === 'function') {
        pageViewRef.current.focusFirstProperty();
      }
    }
  };

  // viewType 변경 핸들러
  const handleChangeViewType = async (type) => {
    if (!currentDocument) return;
    // viewType을 바꾸기 전에 현재 title, content를 먼저 저장합니다.
    await handleSave();
    await updateDocument(currentDocument.id, { viewType: type });
  };

  // 최초 생성 상태 판별: 제목, 내용, 자식 문서 모두 비어있고 viewType이 PAGE
  const isInitial =
    currentDocument &&
    (!currentDocument.content || currentDocument.content.trim() === '') &&
    currentDocument.viewType === 'PAGE';

  // 경로 타이틀 클릭 시 해당 문서로 이동
  const handlePathClick = async (docId) => {
    if (!docId) return;
    try {
      // 문서 목록에서 해당 문서 객체 찾기
      const targetDoc = documents.find(d => d.id === docId);
      if (targetDoc) {
        navigate(`/${docId}-${slugify(targetDoc.title || '제목 없음')}`);
      } else if (currentDocument && String(currentDocument.id) === String(docId)) {
        navigate(`/${docId}-${slugify(currentDocument.title || '제목 없음')}`);
      } else {
        // 목록/제목을 모르면 우선 id만으로 이동 → 이후 슬러그 동기화 이펙트가 정정
        navigate(`/${docId}`);
      }
    } catch (err) {
      console.error('경로 클릭 문서 이동 실패:', err);
    }
  };

  // 잠금 토글 핸들러
  const handleLockToggle = async () => {
    if (!currentDocument || !currentWorkspace) return;
    try {
      const newLockState = !currentDocument.isLocked;
      // 잠금 상태만 업데이트할 때도 현재 title과 content를 함께 보내서 덮어쓰기 방지
      // updateDocument에서 이미 updateCurrentDocument를 호출하여 zustand store가 업데이트됨
      await updateDocument(currentDocument.id, { 
        isLocked: newLockState,
        title: titleRef.current || currentDocument.title || '',
        content: contentRef.current || currentDocument.content || ''
      });
    } catch (error) {
      console.error('잠금 상태 변경 실패:', error);
    }
  };

  if (!currentDocument) {
    return <div className="p-4 text-sm">선택된 문서가 없습니다.</div>;
  }

  if (!currentWorkspace) {
    return <div className="p-4 text-sm">워크스페이스를 불러오는 중...</div>;
  }

  if (documentLoading) {
    return <div className="p-4 text-sm">문서 불러오는 중...</div>;
  }

  return (
    <main className="overflow-x-visible relative bg-white">
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
          user={user}
          currentWorkspace={currentWorkspace}
          path={path}
          onPathClick={handlePathClick}
          onLockToggle={handleLockToggle}
        />
        {currentDocument.viewType === 'PAGE' && (
          <DocumentPageView
            ref={pageViewRef}
            content={content}
            handleContentChange={handleContentChange}
            editorRef={editorRef}
            isReadOnly={isReadOnly}
            isInitial={isInitial}
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
          <div className="p-4">갤러리 뷰는 아직 구현되지 않았습니다.</div>
        )}
      </div>
    </main>
  );
};

export default DocumentEditor;