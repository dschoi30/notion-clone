// src/components/documents/DocumentEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useDocument } from '../../contexts/DocumentContext';
import Editor from '../editor/Editor';
import useDocumentSocket from '../../hooks/useDocumentSocket';
import DocumentShareModal from './DocumentShareModal';
import { Button } from '../ui/button';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';

const DocumentEditor = () => {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const isMyWorkspace = currentWorkspace && currentWorkspace.ownerId === user.id;
  const isGuest = !isMyWorkspace;
  const { currentDocument, updateDocument } = useDocument();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const debounceTimer = useRef(null);
  const prevDocumentRef = useRef();
  const titleRef = useRef(title);
  const contentRef = useRef(content);

  // 공유 모달 상태
  const [showShareModal, setShowShareModal] = useState(false);
  const shareButtonRef = useRef(null);

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

  if (!currentDocument) {
    return <div className="p-4">선택된 문서가 없습니다.</div>;
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="p-4 space-y-4">
        <div className="relative flex items-center justify-between">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="제목 없음"
            className="w-full text-2xl font-bold bg-transparent border-none outline-none"
          />
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
        <Editor 
          content={content} 
          onUpdate={handleContentChange}
        />
      </div>
    </main>
  );
};

export default DocumentEditor;