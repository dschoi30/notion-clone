import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTrashedDocuments,
  restoreDocument,
  deleteDocumentPermanently,
  emptyTrash
} from '@/services/trashApi';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { createLogger } from '@/lib/logger';

const log = createLogger('useTrash');

export default function useTrash(workspaceId) {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  // React Query로 휴지통 문서 목록 조회
  const {
    data: trashedDocuments = [],
    isLoading: loading,
    error: queryError,
    refetch: refetchTrashedDocuments,
  } = useQuery({
    queryKey: ['trashed-documents', workspaceId],
    queryFn: () => getTrashedDocuments(workspaceId),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 1, // 1분 - 휴지통은 자주 변경될 수 있음
  });

  // 에러 처리 (React Query v5 권장 방식)
  useEffect(() => {
    if (queryError) {
      log.error('휴지통 목록 조회 실패', queryError);
      handleError(queryError, {
        customMessage: '휴지통 목록을 불러오지 못했습니다.',
        showToast: true
      });
    }
  }, [queryError, handleError]);

  // 문서 복원 mutation
  const restoreMutation = useMutation({
    mutationFn: ({ docId }) => restoreDocument(workspaceId, docId),
    onSuccess: (_, variables) => {
      // 휴지통 목록에서 제거
      queryClient.setQueryData(['trashed-documents', workspaceId], (oldData) => {
        return (oldData || []).filter(d => d.id !== variables.docId);
      });
      // 문서 목록도 새로고침 (복원된 문서가 다시 나타나야 함)
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (e) => {
      log.error('문서 복원 실패', e);
      handleError(e, {
        customMessage: '문서 복원에 실패했습니다.',
        showToast: true
      });
    },
  });

  // 문서 완전 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: ({ docId }) => deleteDocumentPermanently(workspaceId, docId),
    onSuccess: (_, variables) => {
      // 휴지통 목록에서 제거
      queryClient.setQueryData(['trashed-documents', workspaceId], (oldData) => {
        return (oldData || []).filter(d => d.id !== variables.docId);
      });
    },
    onError: (e) => {
      log.error('문서 완전 삭제 실패', e);
      handleError(e, {
        customMessage: '문서 완전 삭제에 실패했습니다.',
        showToast: true
      });
    },
  });

  // 휴지통 전체 비우기 mutation
  const emptyTrashMutation = useMutation({
    mutationFn: () => emptyTrash(workspaceId),
    onSuccess: () => {
      // 휴지통 목록 비우기
      queryClient.setQueryData(['trashed-documents', workspaceId], []);
    },
    onError: (e) => {
      log.error('휴지통 전체 비우기 실패', e);
      handleError(e, {
        customMessage: '휴지통 전체 비우기에 실패했습니다.',
        showToast: true
      });
    },
  });

  // 기존 API와 호환성을 위한 래퍼 함수
  const fetchTrashedDocuments = useCallback(async () => {
    await refetchTrashedDocuments();
  }, [refetchTrashedDocuments]);

  const handleRestore = useCallback(async (docId, onRestore) => {
    try {
      await restoreMutation.mutateAsync({ docId });
      if (onRestore) onRestore(docId);
    } catch (e) {
      // 에러는 mutation의 onError에서 처리됨
    }
  }, [restoreMutation]);

  const handleDelete = useCallback(async (docId) => {
    try {
      await deleteMutation.mutateAsync({ docId });
    } catch (e) {
      // 에러는 mutation의 onError에서 처리됨
    }
  }, [deleteMutation]);

  const handleDeleteAll = useCallback(async () => {
    try {
      await emptyTrashMutation.mutateAsync();
    } catch (e) {
      // 에러는 mutation의 onError에서 처리됨
    }
  }, [emptyTrashMutation]);

  // setTrashedDocuments는 기존 API와 호환성을 위해 제공 (React Query 캐시 업데이트)
  const setTrashedDocuments = useCallback((updater) => {
    queryClient.setQueryData(['trashed-documents', workspaceId], (oldData) => {
      if (typeof updater === 'function') {
        return updater(oldData || []);
      }
      return updater;
    });
  }, [workspaceId, queryClient]);

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