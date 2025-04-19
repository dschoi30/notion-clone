// components/layout/MainLayout.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDocument } from '../../contexts/DocumentContext';
import { useNavigate } from 'react-router-dom';
import Editor from '../editor/Editor';
import { logout } from '../../services/auth';

function MainLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentDocument, setCurrentDocument] = useState({ content: '', title: '제목 없음' });
  const { createDocument, updateDocument } = useDocument();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDocumentChange = async (content) => {
    if (!currentDocument.id) {
      // 새 문서 생성
      const newDoc = await createDocument({
        title: currentDocument.title,
        content: content
      });
      setCurrentDocument(newDoc);
    } else {
      // 기존 문서 업데이트
      const updatedDoc = await updateDocument(currentDocument.id, {
        ...currentDocument,
        content: content
      });
      setCurrentDocument(updatedDoc);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <div className={`bg-gray-800 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <span className="text-white text-lg font-semibold">Notion Clone</span>
          </div>
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {/* Add navigation items here */}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-gray-700 p-4">
          <div className="flex items-center">
            <div className="text-gray-300 text-sm">
              {user?.email}
            </div>
            <button
              onClick={handleLogout}
              className="ml-3 text-gray-300 hover:text-white text-sm"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto focus:outline-none bg-white">
        <main className="flex-1 relative">
          <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <Editor 
              content={currentDocument.content}
              onUpdate={handleDocumentChange}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;