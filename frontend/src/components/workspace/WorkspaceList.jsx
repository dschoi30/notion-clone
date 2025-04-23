import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function WorkspaceList() {
  const {
    workspaces,
    currentWorkspace,
    loading,
    error,
    fetchWorkspaces,
    createWorkspace,
    deleteWorkspace,
    selectWorkspace
  } = useWorkspace();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCreateWorkspace = async () => {
    try {
      const newWorkspace = await createWorkspace({
        name: '새 워크스페이스',
      });
      selectWorkspace(newWorkspace);
    } catch (err) {
      console.error('워크스페이스 생성 실패:', err);
    }
  };

  const handleDeleteWorkspace = async (id) => {
    try {
      await deleteWorkspace(id);
    } catch (err) {
      console.error('워크스페이스 삭제 실패:', err);
    }
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (error) {
    return <div>에러 발생: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">워크스페이스</h2>
        <Button onClick={handleCreateWorkspace} size="sm">
          <PlusIcon className="w-4 h-4 mr-1" />
          새 워크스페이스
        </Button>
      </div>
      
      {workspaces.length === 0 ? (
        <div className="text-center text-gray-500">
          워크스페이스가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {workspaces.map((workspace) => (
            <Card
              key={workspace.id}
              className={`p-4 cursor-pointer hover:bg-gray-50 ${
                currentWorkspace?.id === workspace.id ? 'bg-gray-100' : ''
              }`}
              onClick={() => selectWorkspace(workspace)}
            >
              <div className="flex items-center justify-between">
                <span>{workspace.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteWorkspace(workspace.id);
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