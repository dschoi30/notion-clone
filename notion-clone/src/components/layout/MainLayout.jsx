// components/layout/MainLayout.jsx
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function MainLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
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
            <div>
              <button
                onClick={handleLogout}
                className="text-gray-300 hover:text-white text-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto focus:outline-none">
        <main className="flex-1 relative z-0 overflow-y-auto">
          {/* Add your main content here */}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;