// src/components/documents/DocumentList.jsx
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useDocument } from '@/contexts/DocumentContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function DocumentList() {
  const {
    documents,
    currentDocument,
    loading,
    error,
    fetchDocuments,
    createDocument,
    deleteDocument,
    selectDocument
  } = useDocument();

  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    if (currentWorkspace) {
      fetchDocuments();
    }
  }, [currentWorkspace, fetchDocuments]);

  const handleCreateDocument = async () => {
    try {
      const newDocument = await createDocument({
        title: '새 문서',
        content: ''
      });
      selectDocument(newDocument);
    } catch (err) {
      console.error('문서 생성 실패:', err);
    }
  };

  const handleDeleteDocument = async (id) => {
    try {
      await deleteDocument(id);
    } catch (err) {
      console.error('문서 삭제 실패:', err);
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="p-4 text-center text-gray-500">
        워크스페이스를 선택해주세요.
      </div>
    );
  }

  if (loading) {
    return <div className="p-4">로딩 중...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">에러: {error}</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">문서</h2>
        <Button onClick={handleCreateDocument} size="sm">
          <PlusIcon className="w-4 h-4 mr-1" />
          새 문서
        </Button>
      </div>
      
      {documents.length === 0 ? (
        <div className="text-center text-gray-500">
          문서가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((document) => (
            <Card
              key={document.id}
              className={`p-4 cursor-pointer hover:bg-gray-50 ${
                currentDocument?.id === document.id ? 'bg-gray-100' : ''
              }`}
              onClick={() => selectDocument(document)}
            >
              <div className="flex items-center justify-between">
                <span>{document.title}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDocument(document.id);
                  }}
                >
                  <TrashIcon className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}