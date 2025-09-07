import api from './api';

// 사용자 프로필 조회
export const getProfile = async () => {
  try {
    const response = await api.get('/api/users/profile');
    return response.data;
  } catch (error) {
    console.error('프로필 조회 실패:', error);
    throw error;
  }
};

// 사용자 프로필 수정 (이름, 이메일, 프로필 이미지)
export const updateProfile = async (profileData) => {
  try {
    const response = await api.put('/api/users/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('프로필 수정 실패:', error);
    throw error;
  }
};

// 비밀번호 변경
export const changePassword = async (passwordData) => {
  try {
    const response = await api.put('/api/users/change-password', passwordData);
    return response.data;
  } catch (error) {
    console.error('비밀번호 변경 실패:', error);
    throw error;
  }
};

// 프로필 이미지 업로드
export const uploadProfileImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/users/profile/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('프로필 이미지 업로드 실패:', error);
    throw error;
  }
};
