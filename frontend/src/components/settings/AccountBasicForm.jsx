import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, User } from 'lucide-react';
import * as userApi from '@/services/userApi';

// Cloudinary 업로드 함수 (WorkspaceGeneralForm에서 가져옴)
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

export default function AccountBasicForm() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setProfileImageUrl(user.profileImageUrl || '');
    }
  }, [user]);

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
      setProfileImageUrl(uploadedUrl);
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
      setError('이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const profileData = {
        name: name.trim(),
        email: email.trim(),
        profileImageUrl
      };
      
      const updatedUser = await userApi.updateProfile(profileData);
      await updateUser(updatedUser.user);
      
      // 성공 메시지는 추후 toast로 대체
      alert('프로필이 업데이트되었습니다.');
    } catch (err) {
      console.error('프로필 업데이트 실패:', err);
      setError('프로필 업데이트에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetProfile = () => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setProfileImageUrl(user.profileImageUrl || '');
      setError('');
    }
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    
    if (!currentPassword) {
      setPasswordError('현재 비밀번호를 입력해주세요.');
      return;
    }
    if (!newPassword) {
      setPasswordError('새 비밀번호를 입력해주세요.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('새 비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError('');
      
      await userApi.changePassword({
        currentPassword,
        newPassword
      });
      
      // 폼 초기화
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      alert('비밀번호가 변경되었습니다.');
    } catch (err) {
      console.error('비밀번호 변경 실패:', err);
      if (err.response?.status === 400) {
        setPasswordError('현재 비밀번호가 올바르지 않습니다.');
      } else {
        setPasswordError('비밀번호 변경에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const hasProfileChanges = user && (
    name !== (user.name || '') || 
    email !== (user.email || '') ||
    profileImageUrl !== (user.profileImageUrl || '')
  );

  const hasPasswordInput = passwordForm.currentPassword || passwordForm.newPassword || passwordForm.confirmPassword;

  if (!user) {
    return (
      <div className="text-sm text-gray-500">사용자 정보를 불러오는 중...</div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* 프로필 정보 섹션 */}
      <div className="space-y-6">
        <h4 className="text-lg font-semibold text-gray-900">프로필 정보</h4>
        
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md border border-red-200">
            {error}
          </div>
        )}

        {/* 프로필 이미지 */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">프로필 이미지</label>
          <div className="flex gap-4 items-center">
            <div className="flex overflow-hidden justify-center items-center w-16 h-16 bg-gray-100 rounded-full">
              {profileImageUrl ? (
                <img 
                  src={profileImageUrl} 
                  alt="프로필" 
                  className="object-cover w-full h-full"
                />
              ) : (
                <User className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex gap-2 items-center"
              >
                <Camera className="w-4 h-4" />
                {uploading ? '업로드 중...' : '이미지 업로드'}
              </Button>
              {profileImageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setProfileImageUrl('')}
                  disabled={uploading || loading}
                  className="text-red-600 hover:text-red-700"
                >
                  이미지 제거
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

        {/* 이름 */}
        <div className="space-y-2">
          <label htmlFor="user-name" className="text-sm font-medium text-gray-700">
            이름
          </label>
          <Input
            id="user-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            disabled={loading}
            className="max-w-md"
          />
        </div>

        {/* 이메일 */}
        <div className="space-y-2">
          <label htmlFor="user-email" className="text-sm font-medium text-gray-700">
            이메일
          </label>
          <Input
            id="user-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일을 입력하세요"
            disabled={loading}
            className="max-w-md"
          />
        </div>

        {/* 프로필 저장/취소 버튼 */}
        <div className="flex gap-3 items-center pt-4 border-t">
          <Button
            onClick={handleSaveProfile}
            disabled={loading || uploading || !hasProfileChanges}
            className="min-w-[80px]"
          >
            {loading ? '저장 중...' : '저장'}
          </Button>
          <Button
            variant="outline"
            onClick={handleResetProfile}
            disabled={loading || uploading || !hasProfileChanges}
          >
            취소
          </Button>
          {hasProfileChanges && (
            <span className="text-xs text-gray-500">변경사항이 있습니다</span>
          )}
        </div>
      </div>

      {/* 비밀번호 변경 섹션 */}
      <div className="pt-6 space-y-6 border-t">
        <h4 className="text-lg font-semibold text-gray-900">비밀번호 변경</h4>
        
        {passwordError && (
          <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md border border-red-200">
            {passwordError}
          </div>
        )}

        {/* 현재 비밀번호 */}
        <div className="space-y-2">
          <label htmlFor="current-password" className="text-sm font-medium text-gray-700">
            현재 비밀번호
          </label>
          <Input
            id="current-password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            placeholder="현재 비밀번호를 입력하세요"
            disabled={passwordLoading}
            className="max-w-md"
          />
        </div>

        {/* 새 비밀번호 */}
        <div className="space-y-2">
          <label htmlFor="new-password" className="text-sm font-medium text-gray-700">
            새 비밀번호
          </label>
          <Input
            id="new-password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            placeholder="새 비밀번호를 입력하세요 (6자 이상)"
            disabled={passwordLoading}
            className="max-w-md"
          />
        </div>

        {/* 새 비밀번호 확인 */}
        <div className="space-y-2">
          <label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">
            새 비밀번호 확인
          </label>
          <Input
            id="confirm-password"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            placeholder="새 비밀번호를 다시 입력하세요"
            disabled={passwordLoading}
            className="max-w-md"
          />
        </div>

        {/* 비밀번호 변경 버튼 */}
        <div className="flex gap-3 items-center pt-4 border-t">
          <Button
            onClick={handleChangePassword}
            disabled={passwordLoading || !hasPasswordInput}
            className="min-w-[80px]"
          >
            {passwordLoading ? '변경 중...' : '비밀번호 변경'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
              });
              setPasswordError('');
            }}
            disabled={passwordLoading || !hasPasswordInput}
          >
            취소
          </Button>
        </div>
      </div>
    </div>
  );
}
