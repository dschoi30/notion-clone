// src/components/documents/DocumentEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useDocument } from '@/contexts/DocumentContext';
import useDocumentSocket from '@/hooks/useDocumentSocket';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import useDocumentPresence from '@/hooks/useDocumentPresence';
import DocumentTableView from './DocumentTableView';
import { getProperties, getPropertyValuesByDocument, addProperty, getDocument } from '@/services/documentApi';
import DocumentHeader from './DocumentHeader';
import DocumentPageView from './DocumentPageView';
import { useParams } from 'react-router-dom';
import { slugify } from '@/lib/utils';

const DocumentEditor = () => {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
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

  // 테이블 속성(컬럼) 및 값 상태 (mock)
  const [properties, setProperties] = useState([]); // [{ id, name, type }]
  const [propertyValues, setPropertyValues] = useState({}); // { [propertyId]: value }
  const [isAddPropOpen, setIsAddPropOpen] = useState(false);
  const addPropBtnRef = useRef(null);

  const { idSlug } = useParams();

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

  // idSlug가 바뀔 때마다 해당 id의 문서를 선택
  useEffect(() => {
    if (!docId || !documents.length) return;
    const found = documents.find(doc => String(doc.id) === String(docId));
    if (found && (!currentDocument || String(currentDocument.id) !== String(docId))) {
      selectDocument(found);
    }
  }, [docId, documents]);

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

  // 부모 문서의 properties 조회
  useEffect(() => {
    if (currentWorkspace?.id && currentDocument?.parentId && currentDocument.viewType === 'PAGE') {
      (async () => {
        const props = await getProperties(currentWorkspace.id, currentDocument.parentId);
        setProperties(props);
        const valuesArr = await getPropertyValuesByDocument(currentWorkspace.id, currentDocument.id);
        const valuesObj = {};
        valuesArr.forEach(v => { valuesObj[v.propertyId] = v.value; });
        setPropertyValues(valuesObj);
      })();
    } else {
      setProperties([]);
      setPropertyValues({});
    }
  }, [currentWorkspace?.id, currentDocument?.id, currentDocument?.viewType]);

  useEffect(() => {
    if (currentDocument) {
      setTitle(currentDocument.title);
      setContent(currentDocument.content || '');
    }
  }, [currentDocument]);

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
    // eslint-disable-next-line
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
    // eslint-disable-next-line
  }, [currentDocument]);

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
    (!currentDocument.title || currentDocument.title.trim() === '') &&
    (!currentDocument.content || currentDocument.content.trim() === '') &&
    currentDocument.viewType === 'PAGE';

  // 경로 타이틀 클릭 시 해당 문서로 이동
  const handlePathClick = async (docId) => {
    if (!docId) return;
    // 문서 목록에서 해당 문서 객체 찾기
    const targetDoc = documents.find(d => d.id === docId);
    if (targetDoc) {
      selectDocument(targetDoc);
      await fetchChildDocuments(docId); // 자식 문서도 갱신
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
            properties={properties}
            propertyValues={propertyValues}
            addPropBtnRef={addPropBtnRef}
            isAddPropOpen={isAddPropOpen}
            setIsAddPropOpen={setIsAddPropOpen}
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
            properties={properties}
            propertyValues={propertyValues}
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