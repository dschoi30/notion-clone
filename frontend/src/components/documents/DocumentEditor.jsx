// src/components/documents/DocumentEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useDocument } from '../../contexts/DocumentContext';
import Editor from '../editor/Editor';
import useDocumentSocket from '../../hooks/useDocumentSocket';
import DocumentShareModal from './DocumentShareModal';
import { Button } from '../ui/button';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import useDocumentPresence from '../../hooks/useDocumentPresence';
import DocumentTableView from './DocumentTableView';

const DocumentEditor = () => {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const isMyWorkspace = currentWorkspace && currentWorkspace.ownerId === user.id;
  const isGuest = !isMyWorkspace;
  const { currentDocument, updateDocument, documentLoading, fetchChildDocuments } = useDocument();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const debounceTimer = useRef(null);
  const prevDocumentRef = useRef();
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const editorRef = useRef(null);

  // 공유 모달 상태
  const [showShareModal, setShowShareModal] = useState(false);
  const shareButtonRef = useRef(null);

  const myPermission = currentDocument?.permissions?.find(p => p.userId === user.id);
  const isReadOnly = myPermission && myPermission.permissionType === 'WRITE';

  const viewers = useDocumentPresence(currentDocument?.id, user);

  // 자식 문서 목록 상태 추가 (최초 진입 시 판별용)
  const [childDocuments, setChildDocuments] = useState([]);

  // 테이블 속성(컬럼) 및 값 상태 (mock)
  const [properties, setProperties] = useState([]); // [{ id, name }]
  const [rows, setRows] = useState([]); // [{ id, values: { [propertyId]: value } }]

  // 속성 추가 모달 상태
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyType, setNewPropertyType] = useState('text');

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
        title: titleRef.current,
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
    await updateDocument(currentDocument.id, { viewType: type });
  };

  // 최초 생성 상태 판별: 제목, 내용, 자식 문서 모두 비어있고 viewType이 PAGE
  const isInitial =
    currentDocument &&
    (!currentDocument.title || currentDocument.title.trim() === '') &&
    (!currentDocument.content || currentDocument.content.trim() === '') &&
    childDocuments.length === 0 &&
    currentDocument.viewType === 'PAGE';

  // '+ 속성 추가' 클릭 시
  const handleAddProperty = () => {
    setShowPropertyModal(true);
    setNewPropertyName('');
    setNewPropertyType('text');
  };

  // 모달에서 속성 추가 확인
  const handleConfirmAddProperty = () => {
    if (!newPropertyName) return;
    const newProperty = { id: Date.now().toString(), name: newPropertyName, type: newPropertyType };
    setProperties(prev => [...prev, newProperty]);
    setRows(prev => prev.map(row => ({ ...row, values: { ...row.values, [newProperty.id]: '' } })));
    setShowPropertyModal(false);
  };

  // '새 페이지' 클릭 시
  const handleAddRow = () => {
    const newRow = { id: Date.now().toString(), title: '', values: {} };
    properties.forEach(p => { newRow.values[p.id] = ''; });
    setRows(prev => [...prev, newRow]);
  };

  // 셀 값 변경
  const handleCellChange = (rowId, propertyId, value) => {
    setRows(prev => prev.map(row =>
      row.id === rowId ? { ...row, values: { ...row.values, [propertyId]: value } } : row
    ));
  };

  // 이름(title) 변경
  const handleTitleCellChange = (rowId, value) => {
    setRows(prev => prev.map(row =>
      row.id === rowId ? { ...row, title: value } : row
    ));
  };

  if (!currentDocument) {
    return <div className="p-4">선택된 문서가 없습니다.</div>;
  }

  if (documentLoading) {
    return <div className="p-4">문서 불러오는 중...</div>;
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="p-4 space-y-4">
        <div className="relative flex items-center justify-between">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            placeholder="제목 없음"
            className="w-full text-2xl font-bold bg-transparent border-none outline-none"
          />
          {/* 권한자 이니셜 아이콘 목록 */}
          <div className="flex items-center mr-2">
            {currentDocument?.permissions?.map((p) => {
              const isPresent = viewers.some(v => String(v.userId) === String(p.userId));
              return (
                <div
                  key={p.userId}
                  className={
                    'flex items-center justify-center w-8 h-8 mr-1 text-base font-bold rounded-full select-none bg-blue-500 text-white ring-2 ring-blue-400 ' +
                    (isPresent ? 'opacity-100' : 'opacity-40')
                  }
                  title={p.name || p.email || ''}
                >
                  {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                </div>
              );
            })}
          </div>
          <div className="flex items-center ml-2 space-x-2">
            <span
              style={{ whiteSpace: 'nowrap' }}
              className={
                (saveStatus === 'saving' ? 'text-blue-500' :
                saveStatus === 'error' ? 'text-red-500' :
                'text-gray-400') + ' ml-2'
              }
            >
              {saveStatus === 'saving' ? '저장 중...' :
              saveStatus === 'error' ? '저장 실패' :
              saveStatus === 'unsaved' ? '저장 대기' : '저장됨'}
            </span>
            {/* 게스트가 아닐 때만 공유 버튼 노출 */}
            {!isGuest && (
              <Button
                ref={shareButtonRef}
                size="sm"
                variant="outline"
                className="ml-2"
                onClick={() => setShowShareModal((v) => !v)}
              >
                공유
              </Button>
            )}
          </div>
          {/* 공유 모달 */}
          {showShareModal && !isGuest && (
            <DocumentShareModal
              open={showShareModal}
              onClose={() => setShowShareModal(false)}
              workspaceId={currentWorkspace.id}
              documentId={currentDocument.id}
              anchorRef={shareButtonRef}
            />
          )}
        </div>
        {/* viewType이 TABLE이면 DocumentTableView, 아니면 기존 에디터 */}
        {currentDocument.viewType === 'TABLE' ? (
          <DocumentTableView
            properties={properties}
            setProperties={setProperties}
            rows={rows}
            setRows={setRows}
          />
        ) : (
          <Editor 
            content={content} 
            onUpdate={handleContentChange}
            ref={editorRef}
            editable={!isReadOnly}
          />
        )}
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