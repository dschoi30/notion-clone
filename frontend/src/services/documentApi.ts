// src/services/documentApi.ts
import api from './api';
import { createLogger } from '@/lib/logger';
import type { Document, DocumentProperty, DocumentPropertyValue, PropertyValue, PermissionType, TagOption, PaginatedResponse } from '@/types';

const log = createLogger('documentApi');

// 문서 목록 조회 (전체 데이터)
export async function getDocuments(workspaceId: number): Promise<Document[]> {
  const response = await api.get<Document[]>(`/api/workspaces/${workspaceId}/documents`);
  return response.data;
}

// 문서 목록 조회 (경량 버전 - DocumentList용, 페이지네이션 지원)
// 페이지네이션 파라미터가 없으면 배열을 반환하고, 있으면 PaginatedResponse를 반환
export async function getDocumentList(
  workspaceId: number,
  page: number | null = null,
  size: number | null = null,
  sort: string = 'sortOrder,asc'
): Promise<PaginatedResponse<Document> | Document[]> {
  const params: Record<string, unknown> = {};
  if (page !== null && size !== null) {
    params.page = page;
    params.size = size;
    params.sort = sort;
  }
  
  // 페이지네이션 파라미터가 있으면 PaginatedResponse, 없으면 배열
  const response = await api.get<PaginatedResponse<Document> | Document[]>(
    `/api/workspaces/${workspaceId}/documents/list`, 
    { params }
  );
  return response.data;
}

// 필드 선택을 지원하는 문서 목록 조회
export async function getDocumentsWithFields(workspaceId: number, fields: string[]): Promise<Document[]> {
  const response = await api.get<Document[]>(`/api/workspaces/${workspaceId}/documents`, {
    params: { fields }
  });
  return response.data;
}

// 무한 스크롤을 지원하는 문서 목록 조회
export async function getDocumentsInfinite(
  workspaceId: number,
  page: number = 0,
  size: number = 20,
  cursor: string | null = null
): Promise<PaginatedResponse<Document>> {
  const response = await api.get<PaginatedResponse<Document>>(`/api/workspaces/${workspaceId}/documents/infinite`, {
    params: { page, size, cursor }
  });
  return response.data;
}

// 단일 문서 조회
export async function getDocument(workspaceId: number, documentId: number): Promise<Document> {
  const response = await api.get<Document>(`/api/workspaces/${workspaceId}/documents/${documentId}`);
  return response.data;
}

export interface CreateDocumentRequest {
  title: string;
  content?: string;
  viewType?: 'PAGE' | 'TABLE' | 'GALLERY';
  parentId?: number;
}

// 새 문서 생성
export const createDocument = async (workspaceId: number, documentData: CreateDocumentRequest): Promise<Document> => {
  const { data } = await api.post<Document>(`/api/workspaces/${workspaceId}/documents`, documentData);
  return data;
};

interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  viewType?: 'PAGE' | 'TABLE' | 'GALLERY';
  isLocked?: boolean;
  titleWidth?: number;
}

// 문서 수정
export async function updateDocument(
  workspaceId: number,
  documentId: number,
  documentData: UpdateDocumentRequest
): Promise<Document> {
  const response = await api.put<Document>(`/api/workspaces/${workspaceId}/documents/${documentId}`, documentData);
  return response.data; 
}

// 문서 삭제
export async function deleteDocument(workspaceId: number, documentId: number): Promise<void> {
  await api.delete(`/api/workspaces/${workspaceId}/documents/${documentId}`);
}

// 문서 정렬 순서 저장
export async function updateDocumentOrder(workspaceId: number, documentIds: number[]): Promise<void> {
  await api.patch(`/api/workspaces/${workspaceId}/documents/order`, { documentIds });
}

export async function fetchImageViaProxy(imageUrl: string): Promise<string> {
  const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  const response = await fetch(proxyUrl); // GET 요청
  if (!response.ok) {
    let errorMsg = '이미지 처리 중 알 수 없는 서버 오류 발생';
    try {
      // 응답 타입을 먼저 확인하거나, JSON 파싱 시도 후 실패 시 텍스트로 읽기
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json() as { error?: string };
          errorMsg = errorData.error || errorMsg;
      } else {
          // JSON이 아니면 텍스트로 읽기 (HTML 내용 등)
          const errorText = await response.text();
          log.error('Non-JSON error response', { errorText, status: response.status, url: proxyUrl });
          // 간단한 메시지 표시 또는 HTML 내용을 기반으로 추론
          errorMsg = '서버로부터 예상치 못한 응답(HTML 등)을 받았습니다.';
      }
    } catch (parseError) {
      log.error('Error parsing error response', parseError);
      // 파싱 에러는 무시 (이미 errorMsg가 설정됨)
    }
    throw new Error(errorMsg);
  }
  const data = await response.json() as { imageUrl?: string }; // JSON 응답 기대
  if (!data.imageUrl) {
      throw new Error('서버에서 이미지 URL을 받지 못했습니다.');
  }
  return data.imageUrl; // 최종 Cloudinary URL 반환
}

/**
 * 파일을 백엔드를 통해 Cloudinary에 업로드
 * @param file 업로드할 이미지 파일
 * @returns 업로드된 이미지 URL
 */
export async function uploadImage(file: File): Promise<string> {
  // 파일 크기 검증 (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기는 10MB를 초과할 수 없습니다.');
  }

  // 파일 타입 검증
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.');
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post<{ imageUrl: string }>('/api/image-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (!response.data.imageUrl) {
      throw new Error('서버에서 이미지 URL을 받지 못했습니다.');
    }
    
    return response.data.imageUrl;
  } catch (error) {
    log.error('Image upload failed', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('이미지 업로드에 실패했습니다.');
  }
}

export async function inviteToDocument(workspaceId: number, documentId: number, email: string): Promise<void> {
  await api.post(`/api/workspaces/${workspaceId}/documents/${documentId}/invite`, { email });
}

export async function getAccessibleDocuments(workspaceId: number): Promise<Document[]> {
  const response = await api.get<Document[]>(`/api/workspaces/${workspaceId}/documents/accessible`);
  return response.data;
}

export async function updateDocumentPermission(
  workspaceId: number,
  documentId: number,
  userId: number,
  permissionType: PermissionType
): Promise<void> {
  await api.patch(`/api/workspaces/${workspaceId}/documents/${documentId}/permissions/${userId}`, { permissionType });
}

export async function removeDocumentPermission(
  workspaceId: number,
  documentId: number,
  userId: number
): Promise<void> {
  await api.delete(`/api/workspaces/${workspaceId}/documents/${documentId}/permissions/${userId}`);
}

// parentId 기반 하위 문서(서브페이지) 목록 조회
export async function getChildDocuments(workspaceId: number, parentId: number | null): Promise<Document[]> {
  const url = parentId == null
    ? `/api/workspaces/${workspaceId}/documents/parent`
    : `/api/workspaces/${workspaceId}/documents/parent/${parentId}`;
  const response = await api.get<Document[]>(url);
  return response.data;
}

// 자식 문서 페이지네이션 (TABLE 뷰 무한 스크롤용)
export async function getChildDocumentsPaged(
  workspaceId: number,
  parentId: number,
  page: number = 0,
  size: number = 50,
  sortField?: string,
  sortDir?: string,
  propId?: number
): Promise<PaginatedResponse<Document>> {
  const url = `/api/workspaces/${workspaceId}/documents/${parentId}/children`;
  const params: Record<string, unknown> = { page, size };
  if (sortField) params.sortField = sortField;
  if (sortDir) params.sortDir = sortDir;
  if (propId) params.propId = propId;
  const response = await api.get<PaginatedResponse<Document>>(url, { params });
  return response.data; // { content, totalElements, totalPages, number, size }
}

// 자식 문서(행) 순서 업데이트
export async function updateChildDocumentOrder(
  workspaceId: number,
  parentId: number,
  documentIds: number[]
): Promise<void> {
  await api.patch(`/api/workspaces/${workspaceId}/documents/${parentId}/children/order`, documentIds);
}

// 현재 정렬 순서로 자식 문서들의 sortOrder 업데이트 (소유자만 가능)
export async function updateChildSortOrderByCurrentSort(
  workspaceId: number,
  documentId: number,
  sortedDocumentIds: number[]
): Promise<void> {
  await api.post(`/api/workspaces/${workspaceId}/documents/${documentId}/children/sort-by-current`, sortedDocumentIds);
}

interface AddPropertyRequest {
  name: string;
  type: string;
  sortOrder: number;
}

// 문서 속성 추가
export async function addProperty(
  workspaceId: number,
  documentId: number,
  propertyData: AddPropertyRequest
): Promise<DocumentProperty> {
  const res = await api.post<DocumentProperty>(
    `/api/workspaces/${workspaceId}/documents/${documentId}/properties`,
    propertyData
  );
  return res.data;
}

// 문서 속성 목록 조회
export async function getProperties(workspaceId: number, documentId: number): Promise<DocumentProperty[]> {
  const res = await api.get<DocumentProperty[]>(`/api/workspaces/${workspaceId}/documents/${documentId}/properties`);
  return res.data;
}

// 문서 속성 삭제
export async function deleteProperty(workspaceId: number, propertyId: number): Promise<void> {
  await api.delete(`/api/workspaces/${workspaceId}/documents/properties/${propertyId}`);
}

// 문서 속성 수정
export async function updateProperty(
  workspaceId: number,
  propertyId: number,
  name: string
): Promise<DocumentProperty> {
  const res = await api.patch<DocumentProperty>(
    `/api/workspaces/${workspaceId}/documents/properties/${propertyId}`,
    { name }
  );
  return res.data;
}

// 속성 값 추가/수정
export async function addOrUpdatePropertyValue(
  workspaceId: number,
  documentId: number,
  propertyId: number,
  value: PropertyValue
): Promise<DocumentPropertyValue & { updatedAt: string; updatedBy?: number }> {
  const res = await api.post<DocumentPropertyValue & { updatedAt: string; updatedBy?: number }>(
    `/api/workspaces/${workspaceId}/documents/${documentId}/properties/${propertyId}/value`,
    { value }
  );
  // { id, documentId, propertyId, value, updatedAt, updatedBy }
  return res.data;
}

// 문서의 모든 속성 값 조회
export async function getPropertyValuesByDocument(
  workspaceId: number,
  documentId: number
): Promise<DocumentPropertyValue[]> {
  const res = await api.get<DocumentPropertyValue[]>(
    `/api/workspaces/${workspaceId}/documents/${documentId}/property-values`
  );
  return res.data;
}

// 속성별 값 조회
export async function getPropertyValuesByProperty(
  workspaceId: number,
  propertyId: number
): Promise<DocumentPropertyValue[]> {
  const res = await api.get<DocumentPropertyValue[]>(
    `/api/workspaces/${workspaceId}/documents/properties/${propertyId}/values`
  );
  return res.data;
}

// 자식 문서들의 모든 속성 값 조회
export async function getPropertyValuesByChildDocuments(
  workspaceId: number,
  parentId: number
): Promise<DocumentPropertyValue[]> {
  const res = await api.get<DocumentPropertyValue[]>(
    `/api/workspaces/${workspaceId}/documents/${parentId}/children/property-values`
  );
  return res.data;
}

// title 컬럼 width 변경
export async function updateTitleWidth(workspaceId: number, documentId: number, width: number): Promise<void> {
  await api.patch(`/api/workspaces/${workspaceId}/documents/${documentId}/title-width`, { width });
}

// property 컬럼 width 변경
export async function updatePropertyWidth(workspaceId: number, propertyId: number, width: number): Promise<void> {
  await api.patch(`/api/workspaces/${workspaceId}/documents/properties/${propertyId}/width`, { width });
}

// 속성 순서 업데이트
export async function updatePropertyOrder(
  workspaceId: number,
  documentId: number,
  propertyIds: number[]
): Promise<void> {
  await api.patch(`/api/workspaces/${workspaceId}/documents/${documentId}/properties/order`, propertyIds);
}

interface TagOptionRequest {
  label: string;
  color?: string;
  sortOrder?: number;
}

// 태그 옵션 추가
export async function addTagOption(
  workspaceId: number,
  propertyId: number,
  tag: TagOptionRequest
): Promise<TagOption> {
  const res = await api.post<TagOption>(
    `/api/workspaces/${workspaceId}/documents/properties/${propertyId}/tag-options`,
    tag
  );
  return res.data;
}

// 태그 옵션 수정
export async function editTagOption(
  workspaceId: number,
  optionId: number,
  tag: TagOptionRequest
): Promise<TagOption> {
  const res = await api.patch<TagOption>(
    `/api/workspaces/${workspaceId}/documents/tag-options/${optionId}`,
    tag
  );
  return res.data;
}

// 태그 옵션 삭제
export async function removeTagOption(workspaceId: number, optionId: number): Promise<void> {
  await api.delete(`/api/workspaces/${workspaceId}/documents/tag-options/${optionId}`);
}

// 태그 옵션 목록 조회 (propertyId 기준)
export async function getTagOptionsByProperty(
  workspaceId: number,
  propertyId: number
): Promise<TagOption[]> {
  const res = await api.get<TagOption[]>(
    `/api/workspaces/${workspaceId}/documents/properties/${propertyId}/tag-options`
  );
  return res.data;
}

// 테이블 문서 목록 조회 (경량)
export async function getTableDocuments(workspaceId: number): Promise<Document[]> {
  const response = await api.get<Document[]>(`/api/workspaces/${workspaceId}/documents/table-list`);
  return response.data;
}

// --- Versioning ---
interface CreateVersionPayload {
  title: string;
  content: string;
  viewType: string;
  titleWidth?: number;
}

export async function createDocumentVersion(
  workspaceId: number,
  documentId: number,
  payload: CreateVersionPayload
): Promise<{ id: number }> {
  const res = await api.post<{ id: number }>(
    `/api/workspaces/${workspaceId}/documents/${documentId}/versions`,
    payload
  );
  return res.data;
}

interface VersionListParams {
  page?: number;
  size?: number;
}

export async function getDocumentVersions(
  workspaceId: number,
  documentId: number,
  params: VersionListParams = { page: 0, size: 20 }
): Promise<PaginatedResponse<{ id: number; createdAt: string; createdBy?: string }>> {
  const res = await api.get<PaginatedResponse<{ id: number; createdAt: string; createdBy?: string }>>(
    `/api/workspaces/${workspaceId}/documents/${documentId}/versions`,
    { params }
  );
  return res.data;
}

export async function getDocumentVersion(
  workspaceId: number,
  documentId: number,
  versionId: number
): Promise<{ id: number; title: string; content: string; viewType: string; createdAt: string }> {
  const res = await api.get<{ id: number; title: string; content: string; viewType: string; createdAt: string }>(
    `/api/workspaces/${workspaceId}/documents/${documentId}/versions/${versionId}`
  );
  return res.data;
}

export async function restoreDocumentVersion(
  workspaceId: number,
  documentId: number,
  versionId: number
): Promise<Document> {
  const res = await api.post<Document>(
    `/api/workspaces/${workspaceId}/documents/${documentId}/versions/${versionId}/restore`
  );
  return res.data;
}
