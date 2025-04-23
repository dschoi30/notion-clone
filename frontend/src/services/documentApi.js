// src/services/documentApi.js
import api from './api';

// 문서 목록 조회
export async function getDocuments(workspaceId) {
  const response = await api.get(`/workspaces/${workspaceId}/documents`);
  return response.data;
}

// 단일 문서 조회
export async function getDocument(workspaceId, documentId) {
  const response = await api.get(`/workspaces/${workspaceId}/documents/${documentId}`);
  return response.data;
}

// 새 문서 생성
export async function createDocument(workspaceId, data) {
  const response = await api.post(`/workspaces/${workspaceId}/documents`, data);
  return response.data;
}

// 문서 수정
export async function updateDocument(workspaceId, documentId, data) {
  const response = await api.put(`/workspaces/${workspaceId}/documents/${documentId}`, data);
  return response.data;
}

// 문서 삭제
export async function deleteDocument(workspaceId, documentId) {
  await api.delete(`/workspaces/${workspaceId}/documents/${documentId}`);
}