import api from './api';

export async function getWorkspaces() {
  const response = await api.get('/api/workspaces');
  return response.data;
}

export async function getWorkspace(id) {
  const response = await api.get(`/api/workspaces/${id}`);
  return response.data;
}

export async function createWorkspace(data) {
  const response = await api.post('/api/workspaces', data);
  return response.data;
}

export async function updateWorkspace(id, data) {
  const response = await api.put(`/api/workspaces/${id}`, data);
  return response.data;
}

export async function deleteWorkspace(id) {
  await api.delete(`/api/workspaces/${id}`);
}

export async function getWorkspaceMembers(id) {
  const response = await api.get(`/api/workspaces/${id}/members`);
  return response.data;
}

export async function addWorkspaceMember(id, email) {
  const response = await api.post(`/api/workspaces/${id}/members`, { email });
  return response.data;
}

export async function removeWorkspaceMember(id, memberId) {
  await api.delete(`/api/workspaces/${id}/members/${memberId}`);
} 