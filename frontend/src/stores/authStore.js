import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import * as auth from '@/services/auth';
import { createLogger } from '@/lib/logger';
import { authSync } from '@/utils/authSync';
import { setSentryUser } from '@/lib/sentry';
import { queryClient } from '@/lib/queryClient';

const alog = createLogger('authStore');

// 기존 토큰 제거 공통 함수
const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('auth-storage');
  localStorage.removeItem('user');
  localStorage.removeItem('userId');
};

// 워크스페이스 관련 상태 초기화 함수
const clearWorkspaceData = (userId = null) => {
  // 워크스페이스 store의 persist storage 제거
  localStorage.removeItem('workspace-storage');
  // selectedWorkspace 제거
  localStorage.removeItem('selectedWorkspace');
  // 워크스페이스별 문서 관련 localStorage 항목들 제거
  // 사용자별로 저장된 lastDocumentId:${userId}:${workspaceId} 패턴만 제거
  if (userId) {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`lastDocumentId:${userId}:`)) {
        localStorage.removeItem(key);
      }
    });
  } else {
    // userId가 없으면 모든 lastDocumentId 패턴 제거 (기존 동작 유지)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('lastDocumentId:')) {
        localStorage.removeItem(key);
      }
    });
  }
  // React Query 캐시 초기화
  queryClient.clear();
};

/**
 * 사용자 데이터 정규화 (공통 로직)
 * @param {Object} data - API 응답 데이터
 * @returns {Object} 정규화된 사용자 데이터
 */
const normalizeUserData = (data) => ({
  id: data.user.id,
  email: data.user.email,
  name: data.user.name,
  profileImageUrl: data.user.profileImageUrl,
  role: data.user.role
});

/**
 * 인증 성공 후 공통 처리 로직
 * @param {Object} userData - 정규화된 사용자 데이터
 * @param {Function} set - Zustand set 함수
 */
const handleAuthSuccess = (userData, set) => {
  set({ user: userData });
  // persist 미들웨어가 자동으로 localStorage에 저장
  // userId는 별도로 관리 필요 시 localStorage에 저장 (기존 로직 유지)
  localStorage.setItem('userId', userData.id);
  
  // Sentry 사용자 컨텍스트 설정
  setSentryUser(userData);
  
  // 다른 탭에 로그인 알림
  authSync.notifyLogin(userData);
};

export const useAuthStore = create(
  devtools(
    persist(
      (set, get) => ({
      // 상태
      user: null,
      loading: false,
      error: null,

      /**
       * 이메일과 비밀번호로 로그인
       * @param {string} email - 사용자 이메일
       * @param {string} password - 사용자 비밀번호
       * @returns {Promise<Object>} 사용자 데이터
       */
      login: async (email, password) => {
        try {
          set({ loading: true, error: null });
          
          // 기존 토큰 제거 (새 로그인 시 이전 세션 무효화)
          clearTokens();
          
          const data = await auth.login(email, password);
          const userData = normalizeUserData(data);
          
          handleAuthSuccess(userData, set);
          
          return userData;
        } catch (err) {
          alog.error('로그인 에러:', err);
          // 에러 객체를 그대로 저장 (useErrorHandler에서 처리)
          set({ error: err });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      /**
       * 새 사용자 회원가입
       * @param {string} email - 사용자 이메일
       * @param {string} password - 사용자 비밀번호
       * @param {string} name - 사용자 이름
       * @returns {Promise<Object>} 사용자 데이터
       */
      register: async (email, password, name) => {
        try {
          set({ loading: true, error: null });
          
          // 기존 토큰 제거
          clearTokens();
          
          const data = await auth.register(email, password, name);
          const userData = normalizeUserData(data);
          
          handleAuthSuccess(userData, set);
          
          return userData;
        } catch (err) {
          alog.error('회원가입 에러:', err);
          // 에러 객체를 그대로 저장 (useErrorHandler에서 처리)
          set({ error: err });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      /**
       * Google OAuth를 통한 로그인
       * @param {string} credential - Google OAuth credential
       * @returns {Promise<Object>} 사용자 데이터
       */
      loginWithGoogle: async (credential) => {
        try {
          set({ loading: true, error: null });
          
          // 기존 토큰 제거
          clearTokens();
          
          const data = await auth.loginWithGoogle(credential);
          const userData = normalizeUserData(data);
          
          handleAuthSuccess(userData, set);
          
          return userData;
        } catch (err) {
          alog.error('구글 로그인 에러:', err);
          // 에러 객체를 그대로 저장 (useErrorHandler에서 처리)
          set({ error: err });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      /**
       * 사용자 로그아웃
       * 토큰 제거 및 상태 초기화
       */
      logout: () => {
        const currentUserId = get().user?.id;
        // 워크스페이스 관련 상태 초기화 (auth.logout() 전에 실행, 현재 사용자 ID 전달)
        clearWorkspaceData(currentUserId);
        
        auth.logout();
        set({ user: null });
        clearTokens();
        setSentryUser(null);
        
        // 다른 탭에 로그아웃 알림
        authSync.notifyLogout('MANUAL_LOGOUT', currentUserId);
      },

      /**
       * 현재 사용자 정보 업데이트
       * @param {Object} updatedUserData - 업데이트할 사용자 데이터
       */
      updateUser: (updatedUserData) => {
        const currentUser = get().user;
        const userData = {
          id: updatedUserData.id || currentUser?.id,
          email: updatedUserData.email,
          name: updatedUserData.name,
          profileImageUrl: updatedUserData.profileImageUrl,
          role: updatedUserData.role
        };
        set({ user: userData });
        // persist 미들웨어가 자동으로 localStorage에 저장
        // userId는 별도로 관리 필요 시 localStorage에 저장
        if (userData.id) {
          localStorage.setItem('userId', userData.id);
        }
        setSentryUser(userData);
      },

      /**
       * 에러 상태 초기화
       */
      clearError: () => set({ error: null }),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({ user: state.user }), // user만 persist
        // persist 복원 완료 후 Sentry 사용자 컨텍스트 설정
        onRehydrateStorage: () => (state) => {
          if (state?.user) {
            setSentryUser(state.user);
          }
        },
      }
    ),
    { name: 'AuthStore' }
  )
);

// store 변경 감지하여 Sentry 동기화 (persist 복원 후에도 동작)
if (typeof window !== 'undefined') {
  useAuthStore.subscribe(
    (state) => state.user,
    (user) => {
      if (user) {
        setSentryUser(user);
      } else {
        setSentryUser(null);
      }
    }
  );
}

