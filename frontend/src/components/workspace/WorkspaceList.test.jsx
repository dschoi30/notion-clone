/* eslint-disable no-undef */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkspaceList from './WorkspaceList';

// Context mocking
globalThis.IntersectionObserver = class {
  constructor() {}
  observe() {}
  disconnect() {}
};

jest.mock('../../contexts/WorkspaceContext', () => {
  return {
    useWorkspace: jest.fn(),
  };
});
jest.mock('../../contexts/AuthContext', () => {
  return {
    useAuth: jest.fn(),
  };
});

const mockWorkspaces = [
  { id: 1, name: '워크스페이스1' },
  { id: 2, name: '워크스페이스2' },
];

const mockSelectWorkspace = jest.fn();
const mockFetchWorkspaces = jest.fn();
const mockLogout = jest.fn();

describe('WorkspaceList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('로딩 중일 때 로딩 메시지를 표시한다', () => {
    require('../../contexts/WorkspaceContext').useWorkspace.mockReturnValue({
      loading: true,
      error: null,
      workspaces: [],
      currentWorkspace: null,
      fetchWorkspaces: mockFetchWorkspaces,
      selectWorkspace: mockSelectWorkspace,
    });
    require('../../contexts/AuthContext').useAuth.mockReturnValue({ logout: mockLogout });
    render(<WorkspaceList />);
    expect(screen.getByText('로딩 중...')).toBeInTheDocument();
  });

  it('에러 발생 시 에러 메시지를 표시한다', () => {
    require('../../contexts/WorkspaceContext').useWorkspace.mockReturnValue({
      loading: false,
      error: '에러 발생',
      workspaces: [],
      currentWorkspace: null,
      fetchWorkspaces: mockFetchWorkspaces,
      selectWorkspace: mockSelectWorkspace,
    });
    require('../../contexts/AuthContext').useAuth.mockReturnValue({ logout: mockLogout });
    render(<WorkspaceList />);
    expect(screen.getByText(/에러: 에러 발생/)).toBeInTheDocument();
  });

  it('워크스페이스 목록이 정상적으로 렌더링된다', () => {
    require('../../contexts/WorkspaceContext').useWorkspace.mockReturnValue({
      loading: false,
      error: null,
      workspaces: mockWorkspaces,
      currentWorkspace: mockWorkspaces[0],
      fetchWorkspaces: mockFetchWorkspaces,
      selectWorkspace: mockSelectWorkspace,
    });
    require('../../contexts/AuthContext').useAuth.mockReturnValue({ logout: mockLogout });
    render(<WorkspaceList />);
    // 드롭다운 토글(h3) 클릭
    const header = screen.getAllByText('워크스페이스1').find(
      el => el.tagName === 'H3'
    );
    fireEvent.click(header);
    expect(screen.getByText('워크스페이스1')).toBeInTheDocument();
    expect(screen.getByText('워크스페이스2')).toBeInTheDocument();
  });

  it('워크스페이스를 선택하면 selectWorkspace가 호출된다', () => {
    require('../../contexts/WorkspaceContext').useWorkspace.mockReturnValue({
      loading: false,
      error: null,
      workspaces: mockWorkspaces,
      currentWorkspace: mockWorkspaces[0],
      fetchWorkspaces: mockFetchWorkspaces,
      selectWorkspace: mockSelectWorkspace,
    });
    require('../../contexts/AuthContext').useAuth.mockReturnValue({ logout: mockLogout });
    render(<WorkspaceList />);
    // 드롭다운 열기
    fireEvent.click(screen.getByText('워크스페이스1'));
    // 워크스페이스2 선택
    fireEvent.click(screen.getByText('워크스페이스2'));
    expect(mockSelectWorkspace).toHaveBeenCalledWith(mockWorkspaces[1]);
  });

  it('워크스페이스 추가 버튼 클릭 시 모달이 열린다', () => {
    require('../../contexts/WorkspaceContext').useWorkspace.mockReturnValue({
      loading: false,
      error: null,
      workspaces: mockWorkspaces,
      currentWorkspace: mockWorkspaces[0],
      fetchWorkspaces: mockFetchWorkspaces,
      selectWorkspace: mockSelectWorkspace,
    });
    require('../../contexts/AuthContext').useAuth.mockReturnValue({ logout: mockLogout });
    render(<WorkspaceList />);
    // 드롭다운 열기
    fireEvent.click(screen.getByText('워크스페이스1'));
    // 추가 버튼 클릭
    fireEvent.click(screen.getByText('워크스페이스 추가'));
    expect(screen.getByText('새 워크스페이스')).toBeInTheDocument();
  });

  it('설정 버튼 클릭 시 설정 모달이 열린다', () => {
    require('../../contexts/WorkspaceContext').useWorkspace.mockReturnValue({
      loading: false,
      error: null,
      workspaces: mockWorkspaces,
      currentWorkspace: mockWorkspaces[0],
      fetchWorkspaces: mockFetchWorkspaces,
      selectWorkspace: mockSelectWorkspace,
    });
    require('../../contexts/AuthContext').useAuth.mockReturnValue({ logout: mockLogout });
    render(<WorkspaceList />);
    // 설정 버튼 클릭
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('워크스페이스 설정')).toBeInTheDocument();
  });

  it('로그아웃 버튼 클릭 시 logout 함수가 호출된다', () => {
    require('../../contexts/WorkspaceContext').useWorkspace.mockReturnValue({
      loading: false,
      error: null,
      workspaces: mockWorkspaces,
      currentWorkspace: mockWorkspaces[0],
      fetchWorkspaces: mockFetchWorkspaces,
      selectWorkspace: mockSelectWorkspace,
    });
    require('../../contexts/AuthContext').useAuth.mockReturnValue({ logout: mockLogout });
    render(<WorkspaceList />);
    // 드롭다운 열기
    fireEvent.click(screen.getByText('워크스페이스1'));
    // 로그아웃 버튼 클릭
    fireEvent.click(screen.getByText('로그아웃'));
    expect(mockLogout).toHaveBeenCalled();
  });
}); 