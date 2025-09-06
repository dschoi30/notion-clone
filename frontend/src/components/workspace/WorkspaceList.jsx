import React, { useEffect, useState, useRef } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Loader2, ChevronRight, ChevronDown, Plus, Settings, LogOut, User } from 'lucide-react';
import WorkspaceSettingsModal from './WorkspaceSettingsModal';
import SettingsPanel from '@/components/settings/SettingsPanel';
import WorkspaceIcon from './WorkspaceIcon';

export default function WorkspaceList() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { 
    workspaces, 
    currentWorkspace, 
    selectWorkspace,
    fetchWorkspaces,
    loading,
    error 
  } = useWorkspace();
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleCreateWorkspace = (e) => {
    e.stopPropagation();
    setIsCreateModalOpen(true);
  };

  const handleOpenSettings = (e) => {
    e.stopPropagation();
    // 기존 모달 대신 새 설정 패널을 엽니다
    setIsSettingsPanelOpen(true);
  };

  const handleLogout = (e) => {
    e.stopPropagation();
    logout();
  };

  if (loading) {
    return (
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm text-gray-500">로딩 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border-b border-gray-200">
        <div className="text-sm text-red-500">에러: {error}</div>
      </div>
    );
  }

  return (
    <div className="relative border-b border-gray-200" ref={dropdownRef}>
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={toggleDropdown}
      >
        <div className="flex items-center flex-1 min-w-0 space-x-2">
          <div className="transition-transform duration-200 ease-in-out transform">
            {isOpen ? (
              <ChevronDown className="flex-shrink-0 w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="flex-shrink-0 w-4 h-4 text-gray-500" />
            )}
          </div>
          <WorkspaceIcon 
            name={currentWorkspace?.name || '워크스페이스'}
            iconUrl={currentWorkspace?.iconUrl}
            size={20}
            showLabel={true}
          />
        </div>
        {currentWorkspace && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0"
            onClick={handleOpenSettings}
          >
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div 
        className={`fixed left-0 w-64 bg-white shadow-lg z-50 transform transition-all duration-200 ease-in-out ${
          isOpen 
            ? 'translate-y-0 opacity-100 pointer-events-auto' 
            : '-translate-y-2 opacity-0 pointer-events-none'
        }`}
        style={{
          top: dropdownRef.current?.getBoundingClientRect().bottom + 'px',
        }}
      >
        <div className="bg-gray-50">
          <div className="border-t border-gray-200">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className={`p-3 pl-8 cursor-pointer hover:bg-gray-100 transition-colors ${
                  currentWorkspace?.id === workspace.id ? 'bg-gray-100' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  selectWorkspace(workspace);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center text-sm text-gray-700">
                  <WorkspaceIcon 
                    name={workspace.name}
                    iconUrl={workspace.iconUrl}
                    size={16}
                    showLabel={true}
                  />
                  {workspace.ownerId !== user.id && (
                    <User className="w-4 h-4 ml-2 text-blue-500" />
                  )}
                  {workspace.ownerId !== user.id && (
                    <span className="ml-1 text-xs text-blue-500">(게스트)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div 
            className="flex items-center p-3 pl-8 space-x-2 text-blue-600 transition-colors border-t border-gray-200 cursor-pointer hover:bg-gray-100"
            onClick={handleCreateWorkspace}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">워크스페이스 추가</span>
          </div>

          <div 
            className="flex items-center p-3 pl-8 space-x-2 text-red-600 transition-colors border-t border-gray-200 cursor-pointer hover:bg-gray-100"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">로그아웃</span>
          </div>
        </div>
      </div>

      {isSettingsOpen && (
        <WorkspaceSettingsModal
          workspace={currentWorkspace}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isCreateModalOpen && (
        <WorkspaceSettingsModal
          workspace={null}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {isSettingsPanelOpen && (
        <SettingsPanel onClose={() => setIsSettingsPanelOpen(false)} />
      )}
    </div>
  );
} 