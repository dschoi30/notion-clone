// src/components/documents/DocumentEditor.jsx
import React, { useState, useEffect } from 'react';
import { useDocument } from '../../contexts/DocumentContext';
import { Button } from '../ui/button';
import Editor from '../editor/Editor';

const DocumentEditor = () => {
  const { currentDocument, updateDocument } = useDocument();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'

  useEffect(() => {
    if (currentDocument) {
      setTitle(currentDocument.title);
      setContent(currentDocument.content || '');
    }
  }, [currentDocument]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    setSaveStatus('unsaved');
  };

  const handleContentChange = (newContent) => {
    setContent(newContent);
    setSaveStatus('unsaved');
  };

  const handleSave = async () => {
    if (!currentDocument) return;

    try {
      setSaveStatus('saving');
      await updateDocument(currentDocument.id, {
        title,
        content,
      });
      setSaveStatus('saved');
    } catch (error) {
      console.error('문서 저장 실패:', error);
      setSaveStatus('error');
    }
  };

  if (!currentDocument) {
    return <div className="p-4">선택된 문서가 없습니다.</div>;
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="제목 없음"
            className="w-full text-2xl font-bold bg-transparent border-none outline-none"
          />
          <Button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            variant={saveStatus === 'error' ? 'destructive' : 'default'}
          >
            {saveStatus === 'saving' ? '저장 중...' : 
            saveStatus === 'error' ? '저장 실패' : 
            saveStatus === 'unsaved' ? '저장' : '저장됨'}
          </Button>
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