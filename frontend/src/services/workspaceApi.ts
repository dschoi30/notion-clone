import api from './api';
import type { Workspace, User } from '@/types';

export async function getWorkspaces(): Promise<Workspace[]> {
  const response = await api.get<Workspace[]>('/api/workspaces');
  return response.data;
}

export async function getWorkspace(id: number): Promise<Workspace> {
  const response = await api.get<Workspace>(`/api/workspaces/${id}`);
  return response.data;
}

export interface CreateWorkspaceRequest {
  name: string;
  iconUrl?: string;
  parentId?: number;
}

export async function createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
  const response = await api.post<Workspace>('/api/workspaces', data);
  return response.data;
}

interface UpdateWorkspaceRequest {
  name?: string;
  iconUrl?: string;
}

export async function updateWorkspace(id: number, data: UpdateWorkspaceRequest): Promise<Workspace> {
  const response = await api.put<Workspace>(`/api/workspaces/${id}`, data);
  return response.data;
}

export async function deleteWorkspace(id: number): Promise<void> {
  await api.delete(`/api/workspaces/${id}`);
}

export async function softDeleteWorkspace(id: number): Promise<void> {
  // 현재 DELETE가 소프트 삭제로 동작하게 바뀌었지만, 명시적 함수 제공
  await api.delete(`/api/workspaces/${id}`);
}

export async function getWorkspaceMembers(id: number): Promise<User[]> {
  const response = await api.get<User[]>(`/api/workspaces/${id}/members`);
  return response.data;
}

export async function addWorkspaceMember(id: number, email: string): Promise<User> {
  const response = await api.post<User>(`/api/workspaces/${id}/members`, { email });
  return response.data;
}

export async function removeWorkspaceMember(id: number, memberId: number): Promise<void> {
  await api.delete(`/api/workspaces/${id}/members/${memberId}`);
}

export async function getAccessibleWorkspaces(): Promise<Workspace[]> {
  const res = await api.get<Workspace[]>('/api/workspaces/accessible');
  return res.data;
}
