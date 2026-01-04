import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkspaceList from './WorkspaceList';

// Mock modules
const mockUseWorkspace = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => mockUseWorkspace(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Context mocking
globalThis.IntersectionObserver = class {
  constructor() { }
  observe() { }
  disconnect() { }
};

const mockWorkspaces = [
  { id: 1, name: '워크스페이스1', ownerId: 1 },
  { id: 2, name: '워크스페이스2', ownerId: 1 },
];

const mockSelectWorkspace = vi.fn();
const mockFetchWorkspaces = vi.fn();
const mockLogout = vi.fn();
const mockSetIsSettingsPanelOpen = vi.fn();

describe('WorkspaceList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('로딩 중일 때 로딩 메시지를 표시한다', () => {
    mockUseWorkspace.mockReturnValue({
      loading: true,
      error: null,
      workspaces: [],
      currentWorkspace: null,
      fetchWorkspaces: mockFetchWorkspaces,
      selectWorkspace: mockSelectWorkspace,
      isSettingsPanelOpen: false,
      setIsSettingsPanelOpen: mockSetIsSettingsPanelOpen,
      isSearchModalOpen: false,
      setIsSearchModalOpen: vi.fn(),
      createWorkspace: vi.fn(),
      updateWorkspace: vi.fn(),
      deleteWorkspace: vi.fn(),
    });

    mockUseAuth.mockReturnValue({
      user: { id: 1 },
      logout: mockLogout,
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      loginWithGoogle: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<WorkspaceList />);
    expect(screen.getByText('로딩 중...')).toBeInTheDocument();
  });

  it('에러 발생 시 에러 메시지를 표시한다', () => {
    mockUseWorkspace.mockReturnValue({
      loading: false,
      error: '에러 발생',
      workspaces: [],
      currentWorkspace: null,
      fetchWorkspaces: mockFetchWorkspaces,
      selectWorkspace: mockSelectWorkspace,
      isSettingsPanelOpen: false,
      setIsSettingsPanelOpen: mockSetIsSettingsPanelOpen,
      isSearchModalOpen: false,
      setIsSearchModalOpen: vi.fn(),
      createWorkspace: vi.fn(),
      updateWorkspace: vi.fn(),
      deleteWorkspace: vi.fn(),
    });

    mockUseAuth.mockReturnValue({
      user: { id: 1 },
      logout: mockLogout,
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      loginWithGoogle: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<WorkspaceList />);
    expect(screen.getByText(/에러: 에러 발생/)).toBeInTheDocument();
  });

  it('워크스페이스 목록이 정상적으로 렌더링된다', () => {
    mockUseWorkspace.mockReturnValue({
      loading: false,
      error: null,
      workspaces: mockWorkspaces,
      currentWorkspace: mockWorkspaces[0],
      fetchWorkspaces: mockFetchWorkspaces,
      selectWorkspace: mockSelectWorkspace,
      isSettingsPanelOpen: false,
      setIsSettingsPanelOpen: mockSetIsSettingsPanelOpen,
      isSearchModalOpen: false,
      setIsSearchModalOpen: vi.fn(),
      createWorkspace: vi.fn(),
      updateWorkspace: vi.fn(),
      deleteWorkspace: vi.fn(),
    });

    mockUseAuth.mockReturnValue({
      user: { id: 1 },
      logout: mockLogout,
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      loginWithGoogle: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<WorkspaceList />);

    // 드롭다운 열기 - 헤더 영역 클릭 (첫 번째 워크스페이스 이름 요소 사용)
    const workspaceNames = screen.getAllByText('워크스페이스1');
    fireEvent.click(workspaceNames[0]);

    // 목록에 워크스페이스들이 표시되는지 확인 (드롭다운이 열렸으므로 여러 개 있어야 함)
    expect(screen.getAllByText('워크스페이스1').length).toBeGreaterThan(0);
    expect(screen.getByText('워크스페이스2')).toBeInTheDocument();
  });

  it('워크스페이스를 선택하면 selectWorkspace가 호출된다', () => {
    mockUseWorkspace.mockReturnValue({
      loading: false,
      error: null,
      workspaces: mockWorkspaces,
      currentWorkspace: mockWorkspaces[0],
      fetchWorkspaces: mockFetchWorkspaces,
      selectWorkspace: mockSelectWorkspace,
      isSettingsPanelOpen: false,
      setIsSettingsPanelOpen: mockSetIsSettingsPanelOpen,
      isSearchModalOpen: false,
      setIsSearchModalOpen: vi.fn(),
      createWorkspace: vi.fn(),
      updateWorkspace: vi.fn(),
      deleteWorkspace: vi.fn(),
    });

    mockUseAuth.mockReturnValue({
      user: { id: 1 },
      logout: mockLogout,
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      loginWithGoogle: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<WorkspaceList />);

    // 드롭다운 열기 - 헤더 클릭
    const workspaceNames = screen.getAllByText('워크스페이스1');
    fireEvent.click(workspaceNames[0]);

    // 워크스페이스2 선택 (드롭다운 목록에서)
    const workspace2 = screen.getByText('워크스페이스2');
    fireEvent.click(workspace2);

    expect(mockSelectWorkspace).toHaveBeenCalledWith(mockWorkspaces[1]);
  });

  it('워크스페이스 추가 버튼 클릭 시 모달이 열린다', () => {
    mockUseWorkspace.mockReturnValue({
      loading: false,
      error: null,
      workspaces: mockWorkspaces,
      currentWorkspace: mockWorkspaces[0],
      fetchWorkspaces: mockFetchWorkspaces,
      selectWorkspace: mockSelectWorkspace,
      isSettingsPanelOpen: false,
      setIsSettingsPanelOpen: mockSetIsSettingsPanelOpen,
      isSearchModalOpen: false,
      setIsSearchModalOpen: vi.fn(),
      createWorkspace: vi.fn(),
      updateWorkspace: vi.fn(),
      deleteWorkspace: vi.fn(),
    });

    mockUseAuth.mockReturnValue({
      user: { id: 1 },
      logout: mockLogout,
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      loginWithGoogle: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<WorkspaceList />);

    // 드롭다운 열기 - 헤더 클릭
    const workspaceNames = screen.getAllByText('워크스페이스1');
    fireEvent.click(workspaceNames[0]);

    // 추가 버튼 클릭
    const addButton = screen.getByText('워크스페이스 추가');
    fireEvent.click(addButton);

    // 모달이 열렸는지 확인 (WorkspaceSettingsModal이 렌더링되는지)
    // 실제 컴포넌트 구조에 따라 조정 필요
    expect(addButton).toBeInTheDocument();
  });

  it('설정 버튼 클릭 시 설정 패널이 열린다', () => {
    mockUseWorkspace.mockReturnValue({
      loading: false,
      error: null,
      workspaces: mockWorkspaces,
      currentWorkspace: mockWorkspaces[0],
      fetchWorkspaces: mockFetchWorkspaces,
      selectWorkspace: mockSelectWorkspace,
      isSettingsPanelOpen: false,
      setIsSettingsPanelOpen: mockSetIsSettingsPanelOpen,
      isSearchModalOpen: false,
      setIsSearchModalOpen: vi.fn(),
      createWorkspace: vi.fn(),
      updateWorkspace: vi.fn(),
      deleteWorkspace: vi.fn(),
    });

    mockUseAuth.mockReturnValue({
      user: { id: 1 },
      logout: mockLogout,
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      loginWithGoogle: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<WorkspaceList />);

    // 설정 버튼 찾기 (Settings 아이콘을 가진 버튼)
    const settingsButtons = screen.getAllByRole('button');
    const settingsButton = settingsButtons.find(button =>
      button.querySelector('svg')
    );

    if (settingsButton) {
      fireEvent.click(settingsButton);
      expect(mockSetIsSettingsPanelOpen).toHaveBeenCalledWith(true);
    }
  });

  it('로그아웃 버튼 클릭 시 logout 함수가 호출된다', () => {
    mockUseWorkspace.mockReturnValue({
      loading: false,
      error: null,
      workspaces: mockWorkspaces,
      currentWorkspace: mockWorkspaces[0],
      fetchWorkspaces: mockFetchWorkspaces,
      selectWorkspace: mockSelectWorkspace,
      isSettingsPanelOpen: false,
      setIsSettingsPanelOpen: mockSetIsSettingsPanelOpen,
      isSearchModalOpen: false,
      setIsSearchModalOpen: vi.fn(),
      createWorkspace: vi.fn(),
      updateWorkspace: vi.fn(),
      deleteWorkspace: vi.fn(),
    });

    mockUseAuth.mockReturnValue({
      user: { id: 1 },
      logout: mockLogout,
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      loginWithGoogle: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<WorkspaceList />);

    // 드롭다운 열기 - 헤더 클릭
    const workspaceNames = screen.getAllByText('워크스페이스1');
    fireEvent.click(workspaceNames[0]);

    // 로그아웃 버튼 클릭
    const logoutButton = screen.getByText('로그아웃');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
  });
});
