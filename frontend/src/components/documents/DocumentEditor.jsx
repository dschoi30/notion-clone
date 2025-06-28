// src/components/documents/DocumentEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useDocument } from '@/contexts/DocumentContext';
import Editor from '@/components/editor/Editor';
import useDocumentSocket from '@/hooks/useDocumentSocket';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import useDocumentPresence from '@/hooks/useDocumentPresence';
import DocumentTableView from './DocumentTableView';
import { getProperties, getPropertyValuesByDocument, addProperty, getDocument } from '@/services/documentApi';
import AddPropertyPopover from './AddPropertyPopover';
import { getColorObj } from '@/lib/colors';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import DocumentHeader from './DocumentHeader';

const DocumentEditor = () => {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const isMyWorkspace = currentWorkspace && currentWorkspace.ownerId === user.id;
  const isGuest = !isMyWorkspace;
  const { currentDocument, updateDocument, documentLoading, fetchChildDocuments, documents } = useDocument();
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

  // 자식 문서 목록 상태 추가 (최초 진입 시 판별용)
  const [childDocuments, setChildDocuments] = useState([]);

  // 테이블 속성(컬럼) 및 값 상태 (mock)
  const [properties, setProperties] = useState([]); // [{ id, name, type }]
  const [propertyValues, setPropertyValues] = useState({}); // { [propertyId]: value }
  const [isAddPropOpen, setIsAddPropOpen] = useState(false);
  const addPropBtnRef = useRef(null);

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
    if (currentWorkspace?.id && currentDocument?.id && currentDocument.viewType === 'PAGE') {
      (async () => {
        const props = await getProperties(currentWorkspace.id, currentDocument.id);
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

  // 최초 진입 시 자식 문서 조회
  useEffect(() => {
    async function fetchChildren() {
      if (currentDocument) {
        const children = await fetchChildDocuments(currentDocument.id);
        setChildDocuments(children);
      } else {
        setChildDocuments([]);
      }
    }
    fetchChildren();
  }, [currentDocument, fetchChildDocuments]);

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
    console.log('sendEdit 호출', newContent);
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
    childDocuments.length === 0 &&
    currentDocument.viewType === 'PAGE';

  // 테이블 컬럼 개수에 따라 minWidth 계산
  const tableMinWidth = `${(1 + properties.length) * 12}rem`;

  // 속성 추가 핸들러
  const handleAddProperty = async (name, type) => {
    if (!name || !type) return;
    try {
      await addProperty(currentWorkspace.id, currentDocument.id, { name, type, sortOrder: properties.length });
      setIsAddPropOpen(false);
      // 추가 후 목록/값 재조회
      const props = await getProperties(currentWorkspace.id, currentDocument.id);
      setProperties(props);
      const valuesArr = await getPropertyValuesByDocument(currentWorkspace.id, currentDocument.id);
      const valuesObj = {};
      valuesArr.forEach(v => { valuesObj[v.propertyId] = v.value; });
      setPropertyValues(valuesObj);
    } catch (e) {
      alert('속성 추가 실패');
    }
  };

  if (!currentDocument) {
    return <div className="p-4">선택된 문서가 없습니다.</div>;
  }

  if (documentLoading) {
    return <div className="p-4">문서 불러오는 중...</div>;
  }

  // TABLE/GALLERY 분기: 이 뷰에서는 row/property fetch 등 하지 않음
  if (currentDocument.viewType === 'TABLE') {
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
          />
          <DocumentTableView
            workspaceId={currentWorkspace.id}
            documentId={currentDocument.id}
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
          />
        </div>
      </main>
    );
  }
  if (currentDocument.viewType === 'GALLERY') {
    // (갤러리 뷰 컴포넌트가 있다면 여기에 분기)
    return <div className="p-4">갤러리 뷰는 아직 구현되지 않았습니다.</div>;
  }

  // PAGE만 아래 렌더링: 속성 fetch/속성 추가/속성 요약 UI 포함
  return (
    <main className="overflow-auto overflow-x-auto flex-1">
      <div className="p-4 space-y-4 min-w-0">
        {/* 상단 타이틀/공유 등 */}
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
        />
        {/* 속성명/값 목록 + 속성 추가 버튼 (PAGE에서만) */}
        {properties.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center mb-2">
            {properties.map((prop) => {
              let value = propertyValues[prop.id] || '';
              let content = null;
              if (prop.type === 'DATE' || prop.type === 'CREATED_AT' || prop.type === 'LAST_UPDATED_AT') {
                content = value ? dayjs(value).locale('ko').format('YYYY년 M월 D일') : '';
              } else if (prop.type === 'TAG') {
                let tags = [];
                try { tags = value ? JSON.parse(value) : []; } catch {}
                content = (
                  <div className="flex gap-1">
                    {tags.map(tag => {
                      const colorObj = getColorObj(tag.color || 'default');
                      return (
                        <span
                          key={tag.label}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs ${colorObj.bg} border ${colorObj.border}`}
                          style={{ whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {tag.label}
                        </span>
                      );
                    })}
                  </div>
                );
              } else {
                content = value;
              }
              return (
                <div key={prop.id} className="flex flex-col items-start min-w-[120px]">
                  <span className="text-xs text-gray-500 font-medium mb-0.5">{prop.name}</span>
                  <span className="text-sm text-gray-900">{content}</span>
                </div>
              );
            })}
            {/* 속성 추가 버튼 */}
            <div className="relative">
              <Button ref={addPropBtnRef} size="sm" variant="ghost" className="ml-2" onClick={() => setIsAddPropOpen(v => !v)}>
                + 속성 추가
              </Button>
              {isAddPropOpen && (
                <div className="absolute left-0 top-full z-10 mt-1" >
                  <AddPropertyPopover onAddProperty={handleAddProperty} />
                </div>
              )}
            </div>
          </div>
        )}
        {/* 에디터 */}
        <Editor 
          content={content} 
          onUpdate={handleContentChange}
          ref={editorRef}
          editable={!isReadOnly}
        />
        {/* 최초 생성 상태에서만 하단 버튼 노출 */}
        {isInitial && (
          <div className="flex gap-2 mt-4">
            <Button onClick={() => handleChangeViewType('TABLE')} variant="outline">테이블</Button>
            <Button onClick={() => handleChangeViewType('GALLERY')} variant="outline">갤러리</Button>
          </div>
        )}
      </div>
    </main>
  );
};

export default DocumentEditor;