import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authSync } from './authSync';

// queryClient 모킹
vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    clear: vi.fn(),
  },
}));

describe('authSync', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('notifyLogout가 호출 가능하다', () => {
    expect(typeof authSync.notifyLogout).toBe('function');
    expect(() => authSync.notifyLogout('TEST_REASON', 1)).not.toThrow();
  });

  it('notifyLogin이 호출 가능하다', () => {
    const user = { id: 1, email: 'test@example.com', name: 'Test User' };
    expect(typeof authSync.notifyLogin).toBe('function');
    expect(() => authSync.notifyLogin(user)).not.toThrow();
  });

  it('destroy가 호출 가능하다', () => {
    expect(typeof authSync.destroy).toBe('function');
    expect(() => authSync.destroy()).not.toThrow();
  });

  it('인스턴스가 존재한다', () => {
    expect(authSync).toBeDefined();
    expect(authSync).toHaveProperty('notifyLogout');
    expect(authSync).toHaveProperty('notifyLogin');
    expect(authSync).toHaveProperty('destroy');
  });
});
