// utils/authSync.js
// 브라우저 탭 간 인증 상태 동기화를 위한 유틸리티
import { createLogger } from '@/lib/logger';
const alog = createLogger('authSync');

class AuthSync {
  constructor() {
    this.channel = new BroadcastChannel('auth-sync');
    this.setupListeners();
  }
  
  setupListeners() {
    this.channel.addEventListener('message', (event) => {
        switch (event.data.type) {
          case 'LOGOUT_REQUIRED':
            this.handleAutoLogout(event.data.reason, event.data.userId);
            break;
          case 'LOGIN_SUCCESS':
            this.handleLoginSuccess(event.data.user);
            break;
        }
    });
  }
  
  notifyLogout(reason, userId = null) {
    this.channel.postMessage({
      type: 'LOGOUT_REQUIRED',
      reason: reason,
      userId: userId
    });
  }
  
  notifyLogin(user) {
    this.channel.postMessage({
      type: 'LOGIN_SUCCESS',
      user: user
    });
  }
  
  handleAutoLogout(reason, userId) {
    // 현재 로그인한 사용자와 다른 사용자의 세션 무효화인지 확인
    const currentUserId = localStorage.getItem('userId');
    
    alog.info('authSync handleAutoLogout:', { reason, userId, currentUserId });
    
    // userId가 있고, currentUserId가 있고, 둘이 다른 경우에만 무시
    if (userId && currentUserId && userId !== currentUserId) {
      // 다른 사용자의 세션 무효화이므로 현재 사용자는 영향받지 않음
      alog.info('다른 사용자의 세션 무효화 - 현재 사용자에게 영향 없음');
      return;
    }

    alog.info('현재 사용자의 세션 무효화 - 로그아웃 처리');
    
    // 현재 사용자의 세션 무효화인 경우에만 로그아웃 처리
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');

    // 커스텀 이벤트 발생 (AuthContext에서 처리)
    const event = new CustomEvent('authSyncLogout', {
      detail: { reason, userId }
    });
    window.dispatchEvent(event);

    // 로그인 페이지로 리다이렉트
    window.location.href = '/login';
  }
  
  handleLoginSuccess(user) {
    // 다른 탭에서 로그인 성공 시 현재 탭도 동기화
    const currentUserId = localStorage.getItem('userId');
    
    // 다른 사용자가 로그인한 경우 현재 사용자 로그아웃
    if (currentUserId && currentUserId !== user.id.toString()) {
      alog.info('다른 사용자 로그인 - 현재 사용자 로그아웃:', currentUserId, '->', user.id);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      
      // 로그아웃 이벤트 발생
      const event = new CustomEvent('authSyncLogout', {
        detail: { reason: 'NEW_LOGIN' }
      });
      window.dispatchEvent(event);
    } else {
      // 같은 사용자이거나 로그인되지 않은 경우 정상 동기화
      const event = new CustomEvent('authSyncLogin', {
        detail: { user }
      });
      window.dispatchEvent(event);
    }
  }
  
  destroy() {
    this.channel.close();
  }
}

export const authSync = new AuthSync();
