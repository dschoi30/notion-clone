import api from './api';
import type { Document } from '@/types';

export async function getTrashedDocuments(workspaceId: number): Promise<Document[]> {
  const res = await api.get<Document[]>(`/api/workspaces/${workspaceId}/documents/trash`);
  return res.data;
}

export async function restoreDocument(workspaceId: number, docId: number): Promise<void> {
  await api.patch(`/api/workspaces/${workspaceId}/documents/trash/${docId}/restore`);
}

export async function deleteDocumentPermanently(workspaceId: number, docId: number): Promise<void> {
  await api.delete(`/api/workspaces/${workspaceId}/documents/trash/${docId}/permanent`);
}

export async function emptyTrash(workspaceId: number): Promise<void> {
  await api.delete(`/api/workspaces/${workspaceId}/documents/trash`);
}
