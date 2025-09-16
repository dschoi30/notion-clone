import { useState, useCallback } from 'react';
import {
  getTrashedDocuments,
  restoreDocument,
  deleteDocumentPermanently,
  emptyTrash
} from '@/services/trashApi';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export default function useTrash(workspaceId) {
  const [trashedDocuments, setTrashedDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const { handleError } = useErrorHandler();

  // 휴지통 문서 목록 fetch
  const fetchTrashedDocuments = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const docs = await getTrashedDocuments(workspaceId);
      setTrashedDocuments(docs);
    } catch (e) {
      setTrashedDocuments([]);
      handleError(e, {
        customMessage: '휴지통 목록을 불러오지 못했습니다.',
        showToast: true
      });
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // 문서 복원
  const handleRestore = useCallback(async (docId, onRestore) => {
    try {
      await restoreDocument(workspaceId, docId);
      setTrashedDocuments(docs => docs.filter(d => d.id !== docId));
      if (onRestore) onRestore(docId);
    } catch (e) {
      handleError(e, {
        customMessage: '문서 복원에 실패했습니다.',
        showToast: true
      });
    }
  }, [workspaceId]);

  // 문서 완전 삭제
  const handleDelete = useCallback(async (docId) => {
    try {
      await deleteDocumentPermanently(workspaceId, docId);
      setTrashedDocuments(docs => docs.filter(d => d.id !== docId));
    } catch (e) {
      handleError(e, {
        customMessage: '문서 완전 삭제에 실패했습니다.',
        showToast: true
      });
    }
  }, [workspaceId]);

  // 휴지통 전체 비우기
  const handleDeleteAll = useCallback(async () => {
    try {
      await emptyTrash(workspaceId);
      setTrashedDocuments([]);
    } catch (e) {
      handleError(e, {
        customMessage: '휴지통 전체 비우기에 실패했습니다.',
        showToast: true
      });
    }
  }, [workspaceId]);

  return {
    trashedDocuments,
    loading,
    fetchTrashedDocuments,
    handleRestore,
    handleDelete,
    handleDeleteAll,
    setTrashedDocuments,
  };
} 