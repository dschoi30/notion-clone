// src/services/documentApi.js
import api from './api';

// 문서 목록 조회
export async function getDocuments(workspaceId) {
  const response = await api.get(`/api/workspaces/${workspaceId}/documents`);
  return response.data;
}

// 단일 문서 조회
export async function getDocument(workspaceId, documentId) {
  const response = await api.get(`/api/workspaces/${workspaceId}/documents/${documentId}`);
  return response.data;
}

// 새 문서 생성
export async function createDocument(workspaceId, documentData) {
  const response = await api.post(`/api/workspaces/${workspaceId}/documents`, documentData);
  return response.data;
}

// 문서 수정
export async function updateDocument(workspaceId, documentId, documentData) {
  const response = await api.put(`/api/workspaces/${workspaceId}/documents/${documentId}`, documentData);
  return response.data; 
}

// 문서 삭제
export async function deleteDocument(workspaceId, documentId) {
  const response = await api.delete(`/api/workspaces/${workspaceId}/documents/${documentId}`);
  return response.data;
}

// 문서 정렬 순서 저장
export async function updateDocumentOrder(workspaceId, documentIds) {
  return api.patch(`/api/workspaces/${workspaceId}/documents/order`, { documentIds });
}

export async function fetchImageViaProxy(imageUrl) {
  const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  const response = await fetch(proxyUrl); // GET 요청
  if (!response.ok) {
    let errorMsg = '이미지 처리 중 알 수 없는 서버 오류 발생';
    try {
      // 응답 타입을 먼저 확인하거나, JSON 파싱 시도 후 실패 시 텍스트로 읽기
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
      } else {
          // JSON이 아니면 텍스트로 읽기 (HTML 내용 등)
          const errorText = await response.text();
          console.error("Non-JSON error response:", errorText); // 로그 기록
          // 간단한 메시지 표시 또는 HTML 내용을 기반으로 추론
          errorMsg = '서버로부터 예상치 못한 응답(HTML 등)을 받았습니다.';
      }
    } catch (parseError) {
      console.error("Error parsing error response:", parseError);
    }
    throw new Error(errorMsg);
  }
  const data = await response.json(); // JSON 응답 기대
  if (!data.imageUrl) {
      throw new Error('서버에서 이미지 URL을 받지 못했습니다.');
  }
  return data.imageUrl; // 최종 Cloudinary URL 반환
}

export async function inviteToDocument(workspaceId, documentId, email) {
  return api.post(`/api/workspaces/${workspaceId}/documents/${documentId}/invite`, { email });
}