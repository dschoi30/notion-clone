import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorkspacePermissions } from './useWorkspacePermissions';

// Context 모킹
const mockUseAuth = vi.fn();
const mockUseWorkspace = vi.fn();
const mockHandleError = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../contexts/WorkspaceContext', () => ({
  useWorkspace: () => mockUseWorkspace(),
}));

vi.mock('./useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: mockHandleError,
  }),
}));

// API 모킹
const mockApiGet = vi.fn();
vi.mock('../services/api', () => ({
  default: {
    get: (...args: any[]) => mockApiGet(...args),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('useWorkspacePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockClear();
    mockHandleError.mockClear();
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'test@example.com', name: 'Test User' },
    });
    mockUseWorkspace.mockReturnValue({
      currentWorkspace: { id: 1, name: 'Test Workspace' },
    });
  });

  it('훅이 정상적으로 초기화된다', () => {
    mockApiGet.mockResolvedValue({
      data: { hasPermission: true, permissions: ['VIEW_DOCUMENT'] },
    });

    const { result } = renderHook(
      () => useWorkspacePermissions(1),
      { wrapper: createWrapper() }
    );

    expect(result.current).toHaveProperty('permissions');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('hasPermission');
    expect(result.current).toHaveProperty('canCreateDocument');
  });

  it('workspaceId가 없으면 권한을 조회하지 않는다', () => {
    renderHook(() => useWorkspacePermissions(), { wrapper: createWrapper() });

    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('user가 없으면 권한을 조회하지 않는다', () => {
    mockUseAuth.mockReturnValue({ user: null });

    renderHook(() => useWorkspacePermissions(1), { wrapper: createWrapper() });

    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('권한 데이터를 불러온다', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        hasPermission: true,
        permissions: ['VIEW_DOCUMENT', 'CREATE_DOCUMENT'],
      },
    });

    const { result } = renderHook(
      () => useWorkspacePermissions(1),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.permissions).toContain('VIEW_DOCUMENT');
    expect(result.current.permissions).toContain('CREATE_DOCUMENT');
  });

  it('hasPermission이 false이면 빈 권한 배열을 반환한다', async () => {
    mockApiGet.mockResolvedValue({
      data: { hasPermission: false, permissions: ['VIEW_DOCUMENT'] },
    });

    const { result } = renderHook(
      () => useWorkspacePermissions(1),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.permissions).toEqual([]);
  });

  it('hasPermission이 특정 권한을 확인한다', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        hasPermission: true,
        permissions: ['CREATE_DOCUMENT', 'EDIT_DOCUMENT'],
      },
    });

    const { result } = renderHook(
      () => useWorkspacePermissions(1),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasPermission('CREATE_DOCUMENT')).toBe(true);
    expect(result.current.hasPermission('DELETE_DOCUMENT')).toBe(false);
  });

  it('canCreateDocument가 권한을 확인한다', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        hasPermission: true,
        permissions: ['CREATE_DOCUMENT'],
      },
    });

    const { result } = renderHook(
      () => useWorkspacePermissions(1),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canCreateDocument()).toBe(true);
    expect(result.current.canEditDocument()).toBe(false);
  });

  it('hasAnyPermission이 여러 권한 중 하나를 확인한다', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        hasPermission: true,
        permissions: ['CREATE_DOCUMENT'],
      },
    });

    const { result } = renderHook(
      () => useWorkspacePermissions(1),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(
      result.current.hasAnyPermission(['CREATE_DOCUMENT', 'EDIT_DOCUMENT'])
    ).toBe(true);
    expect(
      result.current.hasAnyPermission(['EDIT_DOCUMENT', 'DELETE_DOCUMENT'])
    ).toBe(false);
  });

  it('hasAllPermissions이 모든 권한을 확인한다', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        hasPermission: true,
        permissions: ['CREATE_DOCUMENT', 'EDIT_DOCUMENT'],
      },
    });

    const { result } = renderHook(
      () => useWorkspacePermissions(1),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(
      result.current.hasAllPermissions(['CREATE_DOCUMENT', 'EDIT_DOCUMENT'])
    ).toBe(true);
    expect(
      result.current.hasAllPermissions([
        'CREATE_DOCUMENT',
        'EDIT_DOCUMENT',
        'DELETE_DOCUMENT',
      ])
    ).toBe(false);
  });

  it('편의 메서드들이 올바르게 동작한다', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        hasPermission: true,
        permissions: [
          'CREATE_DOCUMENT',
          'EDIT_DOCUMENT',
          'DELETE_DOCUMENT',
          'SHARE_DOCUMENT',
          'MANAGE_MEMBERS',
          'INVITE_MEMBERS',
          'DELETE_WORKSPACE',
        ],
      },
    });

    const { result } = renderHook(
      () => useWorkspacePermissions(1),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canCreateDocument()).toBe(true);
    expect(result.current.canEditDocument()).toBe(true);
    expect(result.current.canDeleteDocument()).toBe(true);
    expect(result.current.canShareDocument()).toBe(true);
    expect(result.current.canManageMembers()).toBe(true);
    expect(result.current.canInviteMembers()).toBe(true);
    expect(result.current.isWorkspaceOwner()).toBe(true);
  });

  it('reloadPermissions가 권한을 다시 불러온다', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        hasPermission: true,
        permissions: ['VIEW_DOCUMENT'],
      },
    });

    const { result } = renderHook(
      () => useWorkspacePermissions(1),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCallCount = mockApiGet.mock.calls.length;

    await result.current.reloadPermissions();

    expect(mockApiGet.mock.calls.length).toBeGreaterThan(initialCallCount);
  });
});

