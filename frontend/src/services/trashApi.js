import api from './api';

export async function getTrashedDocuments(workspaceId) {
  const res = await api.get(`/api/workspaces/${workspaceId}/documents/trash`);
  return res.data;
}

export async function restoreDocument(workspaceId, docId) {
  await api.patch(`/api/workspaces/${workspaceId}/documents/trash/${docId}/restore`);
}

export async function deleteDocumentPermanently(workspaceId, docId) {
  await api.delete(`/api/workspaces/${workspaceId}/documents/trash/${docId}/permanent`);
}

export async function emptyTrash(workspaceId) {
  await api.delete(`/api/workspaces/${workspaceId}/documents/trash`);
} 