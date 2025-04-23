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
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className={`bg-gray-800 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
        <div className="flex flex-col flex-1 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <span className="text-lg font-semibold text-white">Notion Clone</span>
          </div>
          <nav className="flex-1 px-2 mt-5 space-y-1">
            {/* Add navigation items here */}
          </nav>
        </div>
        <div className="flex flex-shrink-0 p-4 border-t border-gray-700">
          <div className="flex items-center">
            <div className="text-sm text-gray-300">
              {user?.email}
            </div>
            <button
              onClick={handleLogout}
              className="ml-3 text-sm text-gray-300 hover:text-white"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto bg-white focus:outline-none">
        <main className="relative flex-1">
          <div className="max-w-4xl px-4 py-6 mx-auto sm:px-6 lg:px-8">
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