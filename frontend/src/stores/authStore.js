import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as auth from '@/services/auth';
import { createLogger } from '@/lib/logger';
import { authSync } from '@/utils/authSync';
import { setSentryUser } from '@/lib/sentry';

const alog = createLogger('authStore');

// 기존 토큰 제거 공통 함수
const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  localStorage.removeItem('userId');
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // 상태
      user: null,
      loading: false,
      error: null,

      // 액션: 로그인
      login: async (email, password) => {
        try {
          set({ loading: true, error: null });
          
          // 기존 토큰 제거 (새 로그인 시 이전 세션 무효화)
          clearTokens();
          
          const data = await auth.login(email, password);
          const userData = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            profileImageUrl: data.user.profileImageUrl,
            role: data.user.role
          };
          
          set({ user: userData });
          localStorage.setItem('userId', userData.id);
          
          // Sentry 사용자 컨텍스트 설정
          setSentryUser(userData);
          
          // 다른 탭에 로그인 알림
          authSync.notifyLogin(userData);
          
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

      // 액션: 회원가입
      register: async (email, password, name) => {
        try {
          set({ loading: true, error: null });
          
          // 기존 토큰 제거
          clearTokens();
          
          const data = await auth.register(email, password, name);
          const userData = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            profileImageUrl: data.user.profileImageUrl,
            role: data.user.role
          };
          
          set({ user: userData });
          localStorage.setItem('userId', userData.id);
          
          // Sentry 사용자 컨텍스트 설정
          setSentryUser(userData);
          
          // 다른 탭에 로그인 알림
          authSync.notifyLogin(userData);
          
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

      // 액션: 구글 로그인
      loginWithGoogle: async (credential) => {
        try {
          set({ loading: true, error: null });
          
          // 기존 토큰 제거
          clearTokens();
          
          const data = await auth.loginWithGoogle(credential);
          const userData = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            profileImageUrl: data.user.profileImageUrl,
            role: data.user.role
          };
          
          set({ user: userData });
          localStorage.setItem('userId', userData.id);
          
          // Sentry 사용자 컨텍스트 설정
          setSentryUser(userData);
          
          // 다른 탭에 로그인 알림
          authSync.notifyLogin(userData);
          
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

      // 액션: 로그아웃
      logout: () => {
        auth.logout();
        set({ user: null });
        clearTokens();
        setSentryUser(null);
        
        // 다른 탭에 로그아웃 알림
        authSync.notifyLogout('MANUAL_LOGOUT');
      },

      // 액션: 사용자 정보 업데이트
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
        localStorage.setItem('user', JSON.stringify(userData));
        setSentryUser(userData);
      },

      // 액션: 에러 초기화
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }), // user만 persist
    }
  )
);

// 초기화: persist 미들웨어가 자동으로 localStorage에서 복원하므로
// store가 생성된 후 user가 있으면 Sentry 설정
if (typeof window !== 'undefined') {
  // store가 생성된 직후에 한 번만 확인
  const checkAndSetSentry = () => {
    const state = useAuthStore.getState();
    if (state.user) {
      setSentryUser(state.user);
    }
  };
  
  // 약간의 지연 후 확인 (persist 미들웨어가 복원할 시간 필요)
  setTimeout(checkAndSetSentry, 0);
  
  // store 변경 감지하여 Sentry 동기화
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

