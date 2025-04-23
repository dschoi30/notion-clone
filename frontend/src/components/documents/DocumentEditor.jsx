// src/components/documents/DocumentEditor.jsx
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDocument } from '@/contexts/DocumentContext';
import { SaveIcon } from 'lucide-react';

export default function DocumentEditor() {
  const { currentDocument, updateDocument, loading, error } = useDocument();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'

  useEffect(() => {
    if (currentDocument) {
      setTitle(currentDocument.title);
      setContent(currentDocument.content);
      setSaveStatus('saved');
    }
  }, [currentDocument]);

  const handleSave = async () => {
    if (!currentDocument) return;

    try {
      setSaveStatus('saving');
      await updateDocument(currentDocument.id, {
        title,
        content
      });
      setSaveStatus('saved');
    } catch (err) {
      console.error('문서 저장 실패:', err);
      setSaveStatus('error');
    }
  };

  if (loading) {
    return <div className="p-4">로딩 중...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">에러: {error}</div>;
  }

  if (!currentDocument) {
    return (
      <div className="p-4 text-center text-gray-500">
        편집할 문서를 선택해주세요.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="문서 제목"
          className="text-xl font-bold"
        />
        <Button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          variant={saveStatus === 'error' ? 'destructive' : 'default'}
        >
          <SaveIcon className="w-4 h-4 mr-1" />
          {saveStatus === 'saving' ? '저장 중...' : 
           saveStatus === 'error' ? '저장 실패' : '저장'}
        </Button>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용을 입력하세요..."
        className="w-full h-[calc(100vh-200px)] p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}