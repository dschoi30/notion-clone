import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import WorkspaceIcon from '@/components/workspace/WorkspaceIcon';
import { Camera } from 'lucide-react';

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
  const { currentWorkspace, updateWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name || '');
      setIconUrl(currentWorkspace.iconUrl || '');
    }
  }, [currentWorkspace]);

  const handleImageUpload = async (event) => {
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
    if (!currentWorkspace) return;
    if (!name.trim()) {
      setError('워크스페이스 이름을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await updateWorkspace(currentWorkspace.id, { name: name.trim(), iconUrl });
      // 성공 메시지는 추후 toast로 대체
      alert('워크스페이스 설정이 저장되었습니다.');
    } catch (err) {
      console.error('워크스페이스 업데이트 실패:', err);
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (currentWorkspace) {
      setName(currentWorkspace.name || '');
      setIconUrl(currentWorkspace.iconUrl || '');
      setError('');
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
    <div className="max-w-2xl space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {/* 워크스페이스 아이콘 */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">아이콘</label>
        <div className="flex items-center gap-4">
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
              disabled={uploading}
              className="flex items-center gap-2"
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
                disabled={uploading || loading}
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
      <div className="space-y-2">
        <label htmlFor="workspace-name" className="text-sm font-medium text-gray-700">
          워크스페이스 이름
        </label>
        <Input
          id="workspace-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="워크스페이스 이름을 입력하세요"
          disabled={loading}
          className="max-w-md"
        />
      </div>

      {/* 저장/취소 버튼 */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <Button
          onClick={handleSave}
          disabled={loading || uploading || !hasChanges}
          className="min-w-[80px]"
        >
          {loading ? '저장 중...' : '저장'}
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={loading || uploading || !hasChanges}
        >
          취소
        </Button>
        {hasChanges && (
          <span className="text-xs text-gray-500">변경사항이 있습니다</span>
        )}
      </div>
    </div>
  );
}