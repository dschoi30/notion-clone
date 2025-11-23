import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import WorkspaceIcon from '@/components/workspace/WorkspaceIcon';
import { Camera, Lock } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { Z_INDEX } from '@/constants/zIndex';

// Cloudinary 업로드 함수 (Editor.jsx에서 가져옴)
const CLOUDINARY_CLOUD_NAME = 'dsjybr8fb';
const CLOUDINARY_UPLOAD_PRESET = 'notion-clone';

async function uploadImageToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('이미지 업로드 실패');
  }
  const data = await response.json();
  return data.secure_url;
}

export default function WorkspaceGeneralForm() {
  const { currentWorkspace, updateWorkspace, deleteWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  // 현재 사용자가 워크스페이스 소유자인지 확인
  const isOwner = currentWorkspace && user && currentWorkspace.ownerId === user.id;

  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name || '');
      setIconUrl(currentWorkspace.iconUrl || '');
    }
  }, [currentWorkspace]);

  const handleImageUpload = async (event) => {
    if (!isOwner) return; // 소유자가 아니면 실행하지 않음
    
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      const uploadedUrl = await uploadImageToCloudinary(file);
      setIconUrl(uploadedUrl);
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
      setError('이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!isOwner) return; // 소유자가 아니면 실행하지 않음
    if (!currentWorkspace) return;
    if (!name.trim()) {
      setError('워크스페이스 이름을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await updateWorkspace(currentWorkspace.id, { name: name.trim(), iconUrl });
      toast({
        title: '설정 저장',
        description: '워크스페이스 설정이 저장되었습니다.',
        variant: 'success',
      });
    } catch (err) {
      console.error('워크스페이스 업데이트 실패:', err);
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (!isOwner) return; // 소유자가 아니면 실행하지 않음
    if (currentWorkspace) {
      setName(currentWorkspace.name || '');
      setIconUrl(currentWorkspace.iconUrl || '');
      setError('');
    }
  };

  const handleConfirmDelete = async () => {
    if (!isOwner || !currentWorkspace) return;
    try {
      setDeleting(true);
      await deleteWorkspace(currentWorkspace.id);
      setConfirmOpen(false);
      toast({ title: '워크스페이스가 삭제되었습니다.', duration: 3000 });
    } catch (err) {
      console.error('워크스페이스 삭제 실패:', err);
      setError('삭제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setDeleting(false);
    }
  };

  const hasChanges = currentWorkspace && (
    name !== (currentWorkspace.name || '') || 
    iconUrl !== (currentWorkspace.iconUrl || '')
  );

  if (!currentWorkspace) {
    return (
      <div className="text-sm text-gray-500">워크스페이스를 선택해주세요.</div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 권한 안내 메시지 */}
      {!isOwner && (
        <div className="flex gap-2 items-center p-3 text-sm text-amber-700 bg-amber-50 rounded-md border border-amber-200">
          <Lock className="w-4 h-4" />
          <span>워크스페이스 소유자만 설정을 변경할 수 있습니다.</span>
        </div>
      )}

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md border border-red-200">
          {error}
        </div>
      )}

      {/* 워크스페이스 아이콘 */}
      <div className={`space-y-3 ${!isOwner ? 'opacity-60 pointer-events-none' : ''}`}>
        <label className="text-sm font-medium text-gray-700">아이콘</label>
        <div className="flex gap-4 items-center">
          <WorkspaceIcon 
            name={name} 
            iconUrl={iconUrl} 
            size={64} 
            showLabel={false}
          />
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={!isOwner || uploading}
              className="flex gap-2 items-center"
            >
              <Camera className="w-4 h-4" />
              {uploading ? '업로드 중...' : '이미지 업로드'}
            </Button>
            {iconUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIconUrl('')}
                disabled={!isOwner || uploading || loading}
                className="text-red-600 hover:text-red-700"
              >
                아이콘 제거
              </Button>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* 워크스페이스 이름 */}
      <div className={`space-y-2 ${!isOwner ? 'opacity-60' : ''}`}>
        <label htmlFor="workspace-name" className="text-sm font-medium text-gray-700">
          워크스페이스 이름
        </label>
        <Input
          id="workspace-name"
          type="text"
          value={name}
          onChange={(e) => isOwner && setName(e.target.value)}
          placeholder="워크스페이스 이름을 입력하세요"
          disabled={!isOwner || loading}
          className="max-w-md"
        />
      </div>

      {/* 저장/취소/삭제 버튼 */}
      <div className={`flex items-center gap-3 pt-4 border-t ${!isOwner ? 'opacity-60' : ''}`}>
        <Button
          onClick={handleSave}
          disabled={!isOwner || loading || uploading || !hasChanges}
          className="min-w-[80px]"
        >
          {loading ? '저장 중...' : '저장'}
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!isOwner || loading || uploading || !hasChanges}
        >
          취소
        </Button>
        <Button
          variant="destructive"
          onClick={() => setConfirmOpen(true)}
          disabled={!isOwner || loading || uploading}
        >
          워크스페이스 삭제
        </Button>
        {hasChanges && isOwner && (
          <span className="text-xs text-gray-500">변경사항이 있습니다</span>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        {confirmOpen && (
          <div
            className="fixed inset-0 bg-black/30"
            style={{ zIndex: Z_INDEX.VERSION_HISTORY }}
            onClick={() => !deleting && setConfirmOpen(false)}
          />
        )}
        <DialogContent overlay={false} contentStyle={{ zIndex: Z_INDEX.VERSION_HISTORY + 1 }}>
          <DialogHeader>
            <DialogTitle>워크스페이스 삭제</DialogTitle>
            <DialogDescription>
              정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}