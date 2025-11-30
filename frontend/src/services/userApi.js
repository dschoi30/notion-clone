import api from './api';
import { createLogger } from '@/lib/logger';

const log = createLogger('userApi');

// 사용자 프로필 조회
export const getProfile = async () => {
  try {
    const response = await api.get('/api/users/profile');
    return response.data;
  } catch (error) {
    log.error('프로필 조회 실패', error);
    throw error;
  }
};

// 사용자 프로필 수정 (이름, 이메일, 프로필 이미지)
export const updateProfile = async (profileData) => {
  try {
    const response = await api.put('/api/users/profile', profileData);
    return response.data;
  } catch (error) {
    log.error('프로필 수정 실패', error);
    throw error;
  }
};

// 비밀번호 변경
export const changePassword = async (passwordData) => {
  try {
    const response = await api.put('/api/users/change-password', passwordData);
    return response.data;
  } catch (error) {
    log.error('비밀번호 변경 실패', error);
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
    log.error('프로필 이미지 업로드 실패', error);
    throw error;
  }
};

// 사용자 목록 조회 (페이지네이션 지원)
export const getUsersPaged = async (page = 0, size = 50, sortField = 'id', sortDir = 'asc') => {
  try {
    const sort = `${sortField},${sortDir}`;
    const response = await api.get('/api/users', {
      params: { page, size, sort }
    });
    return response.data;
  } catch (error) {
    log.error('사용자 목록 조회 실패', error);
    throw error;
  }
};

// ===== SUPER_ADMIN 기능 =====

// 사용자 역할 변경
export const updateUserRole = async (userId, newRole) => {
  try {
    const response = await api.put(`/api/admin/users/${userId}/role`, {
      role: newRole
    });
    return response.data;
  } catch (error) {
    log.error(`사용자 ${userId} 역할 변경 실패`, error);
    throw error;
  }
};

// 사용자 비밀번호 재설정
export const resetUserPassword = async (userId) => {
  try {
    const response = await api.post(`/api/admin/users/${userId}/reset-password`);
    return response.data;
  } catch (error) {
    log.error(`사용자 ${userId} 비밀번호 재설정 실패`, error);
    throw error;
  }
};

// 사용자 계정 활성화/비활성화
export const toggleUserStatus = async (userId, isActive) => {
  try {
    const response = await api.put(`/api/admin/users/${userId}/status`, {
      isActive
    });
    return response.data;
  } catch (error) {
    log.error(`사용자 ${userId} 상태 변경 실패`, error);
    throw error;
  }
};

// 사용자 계정 삭제
export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/api/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    log.error(`사용자 ${userId} 삭제 실패`, error);
    throw error;
  }
};
