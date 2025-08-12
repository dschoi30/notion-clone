// src/components/documents/DocumentEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useDocument } from '@/contexts/DocumentContext';
import useDocumentSocket from '@/hooks/useDocumentSocket';
import useDocumentPresence from '@/hooks/useDocumentPresence';
import { useDocumentPropertiesStore } from '@/hooks/useDocumentPropertiesStore';
import { getProperties, getPropertyValuesByDocument } from '@/services/documentApi';
import { slugify } from '@/lib/utils';
import DocumentTableView from './DocumentTableView';
import usePageStayTimer from '@/hooks/usePageStayTimer';
import { useDocumentPropertiesStore } from '@/hooks/useDocumentPropertiesStore';
import { getProperties, getPropertyValuesByDocument } from '@/services/documentApi';
import { createDocumentVersion } from '@/services/documentApi';
import DocumentHeader from './DocumentHeader';
import DocumentPageView from './DocumentPageView';

const DocumentEditor = () => {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMyWorkspace = currentWorkspace && currentWorkspace.ownerId === user.id;
  const isGuest = !isMyWorkspace;
  const { currentDocument, updateDocument, documentLoading, fetchChildDocuments, documents, selectDocument } = useDocument();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const debounceTimer = useRef(null);
  const prevDocumentRef = useRef();
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const editorRef = useRef(null);

  // 공유 팝오버 상태
  const [showShareModal, setShowShareModal] = useState(false);
  const shareButtonRef = useRef(null);

  const myPermission = currentDocument?.permissions?.find(p => p.userId === user.id);
  const isReadOnly = myPermission && myPermission.permissionType === 'WRITE';

  const viewers = useDocumentPresence(currentDocument?.id, user);
  const { properties, titleWidth } = useDocumentPropertiesStore(state => ({ properties: state.properties, titleWidth: state.titleWidth }));
  const [nextSnapshotMs, setNextSnapshotMs] = useState(10 * 60 * 1000);

  const handleReachTenMinutes = async () => {
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

      await createDocumentVersion(currentWorkspace.id, currentDocument.id, {
        title: titleRef.current || '',
        viewType: currentDocument.viewType,
        titleWidth: titleWidth,
        content: currentDocument.viewType === 'PAGE' ? (contentRef.current || '') : null,
        propertiesJson: JSON.stringify(propsSlim),
        propertyValuesJson: JSON.stringify(valuesObj),
      });
    } catch (e) {
      console.error('버전 생성 실패:', e);
    } finally {
      // 다음 10분 임계치 설정
      setNextSnapshotMs((ms) => ms + 10 * 60 * 1000);
    }
  };

  const { elapsedMs } = usePageStayTimer({ enabled: !!currentDocument, onReachMs: handleReachTenMinutes, targetMs: nextSnapshotMs });

  // (removed) PAGE 내부에서 속성 추가/팝오버 상태 관리

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
        console.log(`URL slug 동기화: ${currentPath} -> ${expectedPath}`);
        navigate(expectedPath, { replace: true });
      } else if (!isSameDocId) {
        // 완전히 다른 문서인 경우 (사이드바에서 선택한 경우)
        console.log(`URL 문서 변경: ${currentPath} -> ${expectedPath}`);
        navigate(expectedPath, { replace: true });
      }
    }
  }, [currentDocument, currentWorkspace]); // location.pathname 의존성 제거로 무한 루프 방지

  // idSlug가 바뀔 때마다 해당 id의 문서를 선택
  useEffect(() => {
    if (!docId || !documents.length || !currentWorkspace) return;
    
    const found = documents.find(doc => String(doc.id) === String(docId));
    if (found) {
      // URL의 문서가 현재 워크스페이스에 있는 경우
      if (!currentDocument || String(currentDocument.id) !== String(docId)) {
        selectDocument(found);
      }
    } else if (docId) {
      // URL의 문서가 현재 워크스페이스에 없는 경우 - 이미 App.jsx에서 처리됨
      console.warn(`DocumentEditor: 문서 ID ${docId}가 현재 워크스페이스(${currentWorkspace.id})의 문서 목록에 존재하지 않습니다.`);
    }
  }, [docId, documents, currentWorkspace, currentDocument]);

  // 경로 계산 유틸
  function getDocumentPath(documentId, documentList) {
    const path = [];
    let doc = documentList.find(d => d.id === documentId);
    while (doc) {
      path.unshift(doc);
      doc = doc.parentId ? documentList.find(d => d.id === doc.parentId) : null;
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
    sendEdit({ content: newContent, userId: currentDocument.userId });
  };

  const handleRemoteEdit = (msg) => {
    if (msg.content !== content) setContent(msg.content);
  };
  const { sendEdit } = useDocumentSocket(currentDocument?.id, handleRemoteEdit);

  const handleSave = async () => {
    if (!currentDocument) return;
    try {
      setSaveStatus('saving');
      await updateDocument(currentDocument.id, {
        title: titleRef.current || '',
        content: contentRef.current,
      });
      setSaveStatus('saved');
    } catch (error) {
      console.error('문서 저장 실패:', error);
      setSaveStatus('error');
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

  // 문서 전환 시 임계치를 현재 누적+10분으로 재설정
  useEffect(() => {
    setNextSnapshotMs(elapsedMs + 10 * 60 * 1000);
  }, [docId]);

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editorRef.current && typeof editorRef.current.focus === 'function') {
        editorRef.current.focus();
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
        navigate(`/${docId}-${slugify(targetDoc.title || 'untitled')}`);
      }
    } catch (err) {
      console.error('경로 클릭 문서 이동 실패:', err);
    }
  };

  if (!currentDocument) {
    return <div className="p-4 text-sm">선택된 문서가 없습니다.</div>;
  }

  if (documentLoading) {
    return <div className="p-4 text-sm">문서 불러오는 중...</div>;
  }

  return (
    <main className="overflow-x-visible relative bg-white">
      <div className="p-4 space-y-4 min-w-0">
        {/* 상단 타이틀/공유/저장 상태/권한자 이니셜 */}
        <DocumentHeader
          title={title}
          onTitleChange={handleTitleChange}
          onTitleKeyDown={handleTitleKeyDown}
          saveStatus={saveStatus}
          isGuest={isGuest}
          showShareModal={showShareModal}
          setShowShareModal={setShowShareModal}
          shareButtonRef={shareButtonRef}
          currentDocument={currentDocument}
          viewers={viewers}
          user={user}
          currentWorkspace={currentWorkspace}
          path={path}
          onPathClick={handlePathClick}
        />
        {currentDocument.viewType === 'PAGE' && (
          <DocumentPageView
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