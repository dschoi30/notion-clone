import { create } from 'zustand';
import * as documentApi from '@/services/documentApi';
import { createLogger } from '@/lib/logger';
import type { DocumentProperty, TagOption } from '@/types';

const log = createLogger('useDocumentPropertiesStore');

interface DocumentPropertiesState {
  properties: DocumentProperty[];
  loading: boolean;
  error: string | null;
  titleWidth: number;
  documentId: number | null;
}

interface DocumentPropertiesActions {
  // 문서 속성 및 태그 옵션 전체 패치
  fetchProperties: (workspaceId: number, documentId: number) => Promise<void>;

  // titleWidth 설정
  setTitleWidth: (width: number) => void;

  // titleWidth 업데이트 (백엔드와 동기화)
  updateTitleWidth: (workspaceId: number, documentId: number, width: number) => Promise<void>;

  // 태그 옵션 추가
  addTagOption: (workspaceId: number, propertyId: number, tag: Partial<TagOption>) => Promise<TagOption | undefined>;

  // 태그 옵션 수정
  editTagOption: (workspaceId: number, optionId: number, tag: Partial<TagOption>) => Promise<TagOption | undefined>;

  // 태그 옵션 삭제
  removeTagOption: (workspaceId: number, optionId: number) => Promise<void>;

  // 현재 문서 ID 저장 (뷰 전환 등에서 활용)
  setDocumentId: (documentId: number | null) => void;
  
  setProperties: (properties: DocumentProperty[]) => void;
}

type DocumentPropertiesStore = DocumentPropertiesState & DocumentPropertiesActions;

export const useDocumentPropertiesStore = create<DocumentPropertiesStore>((set, get) => ({
  properties: [],
  loading: false,
  error: null,
  titleWidth: 288, // 기본값
  documentId: null,

  // 문서 속성 및 태그 옵션 전체 패치
  fetchProperties: async (workspaceId: number, documentId: number): Promise<void> => {
    set({ loading: true, error: null });
    try {
      const properties = await documentApi.getProperties(workspaceId, documentId);
      set({ properties });
    } catch (err) {
      const error = err as Error;
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  // titleWidth 설정
  setTitleWidth: (width: number): void => set({ titleWidth: width }),

  // titleWidth 업데이트 (백엔드와 동기화)
  updateTitleWidth: async (workspaceId: number, documentId: number, width: number): Promise<void> => {
    try {
      await documentApi.updateTitleWidth(workspaceId, documentId, width);
      set({ titleWidth: width });
    } catch (err) {
      log.error('타이틀 컬럼 너비 업데이트 실패', err);
      throw err;
    }
  },

  // 태그 옵션 추가
  addTagOption: async (workspaceId: number, propertyId: number, tag: Partial<TagOption>): Promise<TagOption | undefined> => {
    if (!workspaceId || !propertyId) {
      log.warn('addTagOption: workspaceId 또는 propertyId가 올바르지 않습니다', { workspaceId, propertyId });
      return;
    }
    const result = await documentApi.addTagOption(workspaceId, propertyId, tag);
    const currentDocumentId = get().documentId;
    if (currentDocumentId) {
      await get().fetchProperties(workspaceId, currentDocumentId);
    }
    return result;
  },

  // 태그 옵션 수정
  editTagOption: async (workspaceId: number, optionId: number, tag: Partial<TagOption>): Promise<TagOption | undefined> => {
    if (!workspaceId || !optionId) {
      log.warn('editTagOption: workspaceId 또는 optionId가 올바르지 않습니다', { workspaceId, optionId });
      return;
    }
    const result = await documentApi.editTagOption(workspaceId, optionId, tag);
    const currentDocumentId = get().documentId;
    if (currentDocumentId) {
      await get().fetchProperties(workspaceId, currentDocumentId);
    }
    return result;
  },

  // 태그 옵션 삭제
  removeTagOption: async (workspaceId: number, optionId: number): Promise<void> => {
    if (!workspaceId || !optionId) {
      log.warn('removeTagOption: workspaceId 또는 optionId가 올바르지 않습니다', { workspaceId, optionId });
      return;
    }
    await documentApi.removeTagOption(workspaceId, optionId);
    const currentDocumentId = get().documentId;
    if (currentDocumentId) {
      await get().fetchProperties(workspaceId, currentDocumentId);
    }
  },

  // 현재 문서 ID 저장 (뷰 전환 등에서 활용)
  setDocumentId: (documentId: number | null): void => set({ documentId }),
  
  setProperties: (properties: DocumentProperty[]): void => {
    set({ properties });
  },
}));

