import api from './api';
import { createLogger } from '@/lib/logger';
import type { User, UserRole, PaginatedResponse } from '@/types';

const log = createLogger('userApi');

interface UserProfile {
  id: number;
  email: string;
  name: string;
  profileImageUrl?: string;
}

interface UpdateProfileRequest {
  name?: string;
  email?: string;
  profileImageUrl?: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// 사용자 프로필 조회
export const getProfile = async (): Promise<UserProfile> => {
  try {
    const response = await api.get<UserProfile>('/api/users/profile');
    return response.data;
  } catch (error) {
    log.error('프로필 조회 실패', error);
    throw error;
  }
};

// 사용자 프로필 수정 (이름, 이메일, 프로필 이미지)
export const updateProfile = async (profileData: UpdateProfileRequest): Promise<UserProfile> => {
  try {
    const response = await api.put<UserProfile>('/api/users/profile', profileData);
    return response.data;
  } catch (error) {
    log.error('프로필 수정 실패', error);
    throw error;
  }
};

// 비밀번호 변경
export const changePassword = async (passwordData: ChangePasswordRequest): Promise<void> => {
  try {
    await api.put('/api/users/change-password', passwordData);
  } catch (error) {
    log.error('비밀번호 변경 실패', error);
    throw error;
  }
};

// 프로필 이미지 업로드
export const uploadProfileImage = async (file: File): Promise<{ imageUrl: string }> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<{ imageUrl: string }>('/api/users/profile/upload-image', formData, {
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
export const getUsersPaged = async (
  page: number = 0,
  size: number = 50,
  sortField: string = 'id',
  sortDir: 'asc' | 'desc' = 'asc'
): Promise<PaginatedResponse<User>> => {
  try {
    const sort = `${sortField},${sortDir}`;
    const response = await api.get<PaginatedResponse<User>>('/api/users', {
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
export const updateUserRole = async (userId: number, newRole: UserRole): Promise<User> => {
  try {
    const response = await api.put<User>(`/api/admin/users/${userId}/role`, {
      role: newRole
    });
    return response.data;
  } catch (error) {
    log.error(`사용자 ${userId} 역할 변경 실패`, error);
    throw error;
  }
};

// 사용자 비밀번호 재설정
export const resetUserPassword = async (userId: number): Promise<{ newPassword: string }> => {
  try {
    const response = await api.post<{ newPassword: string }>(`/api/admin/users/${userId}/reset-password`);
    return response.data;
  } catch (error) {
    log.error(`사용자 ${userId} 비밀번호 재설정 실패`, error);
    throw error;
  }
};

// 사용자 계정 활성화/비활성화
export const toggleUserStatus = async (userId: number, isActive: boolean): Promise<User> => {
  try {
    const response = await api.put<User>(`/api/admin/users/${userId}/status`, {
      isActive
    });
    return response.data;
  } catch (error) {
    log.error(`사용자 ${userId} 상태 변경 실패`, error);
    throw error;
  }
};

// 사용자 계정 삭제
export const deleteUser = async (userId: number): Promise<void> => {
  try {
    await api.delete(`/api/admin/users/${userId}`);
  } catch (error) {
    log.error(`사용자 ${userId} 삭제 실패`, error);
    throw error;
  }
};
