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
export const createDocument = async (workspaceId, documentData) => {
  const { data } = await api.post(`/api/workspaces/${workspaceId}/documents`, documentData);
  return data;
};

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

export async function getAccessibleDocuments(workspaceId) {
  const response = await api.get(`/api/workspaces/${workspaceId}/documents/accessible`);
  return response.data;
}

export async function updateDocumentPermission(workspaceId, documentId, userId, permissionType) {
  return api.patch(`/api/workspaces/${workspaceId}/documents/${documentId}/permissions/${userId}`, { permissionType });
}

export async function removeDocumentPermission(workspaceId, documentId, userId) {
  return api.delete(`/api/workspaces/${workspaceId}/documents/${documentId}/permissions/${userId}`);
}

// parentId 기반 하위 문서(서브페이지) 목록 조회
export async function getChildDocuments(workspaceId, parentId) {
  const url = parentId == null
    ? `/api/workspaces/${workspaceId}/documents/parent`
    : `/api/workspaces/${workspaceId}/documents/parent/${parentId}`;
  const response = await api.get(url);
  return response.data;
}

// 자식 문서(행) 순서 업데이트
export async function updateChildDocumentOrder(workspaceId, parentId, documentIds) {
  return api.patch(`/api/workspaces/${workspaceId}/documents/${parentId}/children/order`, documentIds);
}

// 현재 정렬 순서로 자식 문서들의 sortOrder 업데이트 (소유자만 가능)
export async function updateChildSortOrderByCurrentSort(workspaceId, documentId, sortedDocumentIds) {
  return api.post(`/api/workspaces/${workspaceId}/documents/${documentId}/children/sort-by-current`, sortedDocumentIds);
}

// 문서 속성 추가
export async function addProperty(workspaceId, documentId, { name, type, sortOrder }) {
  const res = await api.post(`/api/workspaces/${workspaceId}/documents/${documentId}/properties`, { name, type, sortOrder });
  return res.data;
}

// 문서 속성 목록 조회
export async function getProperties(workspaceId, documentId) {
  const res = await api.get(`/api/workspaces/${workspaceId}/documents/${documentId}/properties`);
  return res.data;
}

// 문서 속성 삭제
export async function deleteProperty(workspaceId, propertyId) {
  await api.delete(`/api/workspaces/${workspaceId}/documents/properties/${propertyId}`);
}

// 문서 속성 수정
export async function updateProperty(workspaceId, propertyId, name) {
  const res = await api.patch(`/api/workspaces/${workspaceId}/documents/properties/${propertyId}`, { name });
  return res.data;
}

// 속성 값 추가/수정
export async function addOrUpdatePropertyValue(workspaceId, documentId, propertyId, value) {
  const res = await api.post(`/api/workspaces/${workspaceId}/documents/${documentId}/properties/${propertyId}/value`, { value });
  // { id, documentId, propertyId, value, updatedAt, updatedBy }
  return res.data;
}

// 문서의 모든 속성 값 조회
export async function getPropertyValuesByDocument(workspaceId, documentId) {
  const res = await api.get(`/api/workspaces/${workspaceId}/documents/${documentId}/property-values`);
  return res.data;
}

// 속성별 값 조회
export async function getPropertyValuesByProperty(workspaceId, propertyId) {
  const res = await api.get(`/api/workspaces/${workspaceId}/documents/properties/${propertyId}/values`);
  return res.data;
}

// 자식 문서들의 모든 속성 값 조회
export async function getPropertyValuesByChildDocuments(workspaceId, parentId) {
  const res = await api.get(`/api/workspaces/${workspaceId}/documents/${parentId}/children/property-values`);
  return res.data;
}

// title 컬럼 width 변경
export async function updateTitleWidth(workspaceId, documentId, width) {
  return api.patch(`/api/workspaces/${workspaceId}/documents/${documentId}/title-width`, { width });
}

// property 컬럼 width 변경
export async function updatePropertyWidth(workspaceId, propertyId, width) {
  return api.patch(`/api/workspaces/${workspaceId}/documents/properties/${propertyId}/width`, { width });
}

// 속성 순서 업데이트
export async function updatePropertyOrder(workspaceId, documentId, propertyIds) {
  return api.patch(`/api/workspaces/${workspaceId}/documents/${documentId}/properties/order`, propertyIds);
}

// 태그 옵션 추가
export async function addTagOption(workspaceId, propertyId, tag) {
  const res = await api.post(`/api/workspaces/${workspaceId}/documents/properties/${propertyId}/tag-options`, tag);
  return res.data;
}

// 태그 옵션 수정
export async function editTagOption(workspaceId, optionId, tag) {
  const res = await api.patch(`/api/workspaces/${workspaceId}/documents/tag-options/${optionId}`, tag);
  return res.data;
}

// 태그 옵션 삭제
export async function removeTagOption(workspaceId, optionId) {
  const res = await api.delete(`/api/workspaces/${workspaceId}/documents/tag-options/${optionId}`);
  return res.data;
}

// 태그 옵션 목록 조회 (propertyId 기준)
export async function getTagOptionsByProperty(workspaceId, propertyId) {
  const res = await api.get(`/api/workspaces/${workspaceId}/documents/properties/${propertyId}/tag-options`);
  return res.data;
}

// --- Versioning ---
export async function createDocumentVersion(workspaceId, documentId, payload) {
  const res = await api.post(`/api/workspaces/${workspaceId}/documents/${documentId}/versions`, payload);
  return res.data;
}

export async function getDocumentVersions(workspaceId, documentId, params = { page: 0, size: 20 }) {
  const res = await api.get(`/api/workspaces/${workspaceId}/documents/${documentId}/versions`, { params });
  return res.data;
}

export async function getDocumentVersion(workspaceId, documentId, versionId) {
  const res = await api.get(`/api/workspaces/${workspaceId}/documents/${documentId}/versions/${versionId}`);
  return res.data;
}

export async function restoreDocumentVersion(workspaceId, documentId, versionId) {
  const res = await api.post(`/api/workspaces/${workspaceId}/documents/${documentId}/versions/${versionId}/restore`);
  return res.data;
}