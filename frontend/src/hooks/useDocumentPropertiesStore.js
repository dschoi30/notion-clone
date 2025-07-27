import { create } from 'zustand';
import * as documentApi from '@/services/documentApi';

export const useDocumentPropertiesStore = create((set, get) => ({
  properties: [],
  loading: false,
  error: null,

  // 문서 속성 및 태그 옵션 전체 패치
  fetchProperties: async (workspaceId, documentId) => {
    set({ loading: true, error: null });
    try {
      const properties = await documentApi.getProperties(workspaceId, documentId);
      set({ properties });
    } catch (err) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  // 태그 옵션 추가
  addTagOption: async (workspaceId, propertyId, tag) => {
    if (!workspaceId || !propertyId) {
      console.warn('addTagOption: workspaceId 또는 propertyId가 올바르지 않습니다', workspaceId, propertyId);
      return;
    }
    const result = await documentApi.addTagOption(workspaceId, propertyId, tag);
    await get().fetchProperties(workspaceId, get().documentId);
    return result;
  },

  // 태그 옵션 수정
  editTagOption: async (workspaceId, optionId, tag) => {
    if (!workspaceId || !optionId) {
      console.warn('editTagOption: workspaceId 또는 optionId가 올바르지 않습니다', workspaceId, optionId);
      return;
    }
    const result = await documentApi.editTagOption(workspaceId, optionId, tag);
    await get().fetchProperties(workspaceId, get().documentId);
    return result;
  },

  // 태그 옵션 삭제
  removeTagOption: async (workspaceId, optionId) => {
    if (!workspaceId || !optionId) {
      console.warn('removeTagOption: workspaceId 또는 optionId가 올바르지 않습니다', workspaceId, optionId);
      return;
    }
    const result = await documentApi.removeTagOption(workspaceId, optionId);
    await get().fetchProperties(workspaceId, get().documentId);
    return result;
  },

  // 현재 문서 ID 저장 (뷰 전환 등에서 활용)
  setDocumentId: (documentId) => set({ documentId }),
  documentId: null,
  setProperties: (properties) => {
    set({ properties });
  },
})); 