import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function WorkspaceSettingsModal({ workspace, isOpen, onClose }) {
  const [name, setName] = useState('');
  const { updateWorkspace, deleteWorkspace, createWorkspace } = useWorkspace();

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
    } else {
      setName('');
    }
  }, [workspace, isOpen]);

  const handleUpdate = async () => {
    try {
      if (workspace) {
        await updateWorkspace(workspace.id, { name });
      } else {
        const newWorkspace = await createWorkspace({ name });
      }
      onClose();
    } catch (err) {
      console.error(workspace ? '워크스페이스 수정 실패:' : '워크스페이스 생성 실패:', err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('정말로 이 워크스페이스를 삭제하시겠습니까?')) {
      try {
        await deleteWorkspace(workspace.id);
        onClose();
      } catch (err) {
        console.error('워크스페이스 삭제 실패:', err);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {workspace ? '워크스페이스 설정' : '새 워크스페이스'}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">워크스페이스 이름</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="워크스페이스 이름을 입력하세요"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          {workspace ? (
            <>
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                삭제
              </Button>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                >
                  취소
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={!name.trim()}
                >
                  저장
                </Button>
              </div>
            </>
          ) : (
            <div className="flex justify-end w-full space-x-2">
              <Button
                variant="outline"
                onClick={onClose}
              >
                취소
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={!name.trim()}
              >
                생성
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 