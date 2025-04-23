import React, { useEffect, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, ChevronRight, ChevronDown, Plus, Pencil, Trash, PlusIcon, FolderIcon, FileIcon } from 'lucide-react';

const WorkspaceNode = ({ workspace, level = 0 }) => {
  const { currentWorkspace, selectWorkspace, fetchSubWorkspaces, updateWorkspace, deleteWorkspace } = useWorkspace();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(workspace.name);
  const [subWorkspaces, setSubWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!isExpanded && subWorkspaces.length === 0) {
      setLoading(true);
      try {
        const data = await fetchSubWorkspaces(workspace.id);
        setSubWorkspaces(data);
      } finally {
        setLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  const handleSelect = () => {
    selectWorkspace(workspace);
  };

  const handleEdit = async (e) => {
    e.stopPropagation();
    if (isEditing) {
      try {
        await updateWorkspace(workspace.id, editName, workspace.parentId);
        setIsEditing(false);
      } catch (err) {
        console.error('Failed to update workspace:', err);
      }
    } else {
      setIsEditing(true);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm('이 워크스페이스를 삭제하시겠습니까?')) {
      try {
        await deleteWorkspace(workspace.id);
      } catch (err) {
        console.error('Failed to delete workspace:', err);
      }
    }
  };

  return (
    <div className="workspace-node">
      <div
        className={'flex items-center p-2 hover:bg-gray-100 cursor-pointer ' + 
          (currentWorkspace?.id === workspace.id ? 'bg-gray-100' : '')}
        style={{ paddingLeft: `${level * 20}px` }}
        onClick={handleSelect}
      >
        <button
          className="flex items-center justify-center w-6 h-6"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          )}
        </button>
        
        {isEditing ? (
          <Input
            className="flex-1 mx-2"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEdit(e);
              if (e.key === 'Escape') {
                setIsEditing(false);
                setEditName(workspace.name);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span className="flex-1 mx-2">{workspace.name}</span>
        )}

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            onClick={handleEdit}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            onClick={handleDelete}
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="workspace-children">
          {subWorkspaces.map((child) => (
            <WorkspaceNode
              key={child.id}
              workspace={child}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const WorkspaceTree = () => {
  const {
    workspaces,
    currentWorkspace,
    loading,
    error,
    fetchWorkspaces,
    createWorkspace,
    selectWorkspace
  } = useWorkspace();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  if (loading) {
    return <div className="p-4">로딩 중...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">에러: {error}</div>;
  }

  const handleCreateWorkspace = async () => {
    try {
      await createWorkspace({ name: '새 워크스페이스' });
    } catch (err) {
      console.error('워크스페이스 생성 실패:', err);
    }
  };

  return (
    <div className="p-2">
      <Button
        variant="ghost"
        className="justify-start w-full mb-4"
        onClick={handleCreateWorkspace}
      >
        <PlusIcon className="w-4 h-4 mr-2" />
        새 워크스페이스
      </Button>
      
      <div className="space-y-1">
        {workspaces.map((workspace) => (
          <Button
            key={workspace.id}
            variant="ghost"
            className={`w-full justify-start ${
              currentWorkspace?.id === workspace.id ? 'bg-gray-200' : ''
            }`}
            onClick={() => selectWorkspace(workspace)}
          >
            <FolderIcon className="w-4 h-4 mr-2" />
            {workspace.name}
          </Button>
        ))}
      </div>
    </div>
  );
}; 