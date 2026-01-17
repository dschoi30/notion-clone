import { Fragment, useCallback, ChangeEvent, KeyboardEvent, RefObject } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useShallow } from 'zustand/react/shallow';
import UserBadge from '@/components/documents/shared/UserBadge';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import VersionHistoryPanel from './VersionHistoryPanel';
import DocumentSharePopover from './DocumentSharePopover';
import { Z_INDEX } from '@/constants/zIndex';
import { Lock, Unlock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasWritePermission } from '@/utils/permissionUtils';
import type { Document, Workspace } from '@/types';
import type { ConnectionStatus } from '@/hooks/useDocumentSocket';

type SaveStatus = 'saved' | 'saving' | 'error' | 'unsaved';

interface DocumentHeaderProps {
  title: string;
  onTitleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onTitleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  saveStatus: SaveStatus;
  isReadOnly: boolean;
  showShareModal: boolean;
  setShowShareModal: (v: boolean | ((prev: boolean) => boolean)) => void;
  shareButtonRef: RefObject<HTMLButtonElement>;
  currentDocument: Document | null;
  viewers?: Array<{ userId: number }>;
  currentWorkspace: Workspace | null;
  path: Document[];
  onPathClick: (id: number) => void;
  onLockToggle: () => void;
  /** WebSocket 연결 상태 (선택) */
  connectionStatus?: ConnectionStatus;
}

export default function DocumentHeader({
  title,
  onTitleChange,
  onTitleKeyDown,
  saveStatus,
  isReadOnly,
  showShareModal,
  setShowShareModal,
  shareButtonRef,
  currentDocument,
  viewers,
  currentWorkspace,
  path,
  onPathClick,
  onLockToggle,
  connectionStatus
}: DocumentHeaderProps) {
  // 버전 기록 패널 상태 (zustand store에서 관리)
  const { showVersionHistory, setShowVersionHistory } = useUIStore(
    useShallow((state) => ({
      showVersionHistory: state.showVersionHistory,
      setShowVersionHistory: state.setShowVersionHistory
    }))
  );
  const { user } = useAuth();
  const handleCloseVersions = useCallback(() => setShowVersionHistory(false), [setShowVersionHistory]);
  const isTableView = currentDocument?.viewType === 'TABLE';
  const paddingClasses = isTableView
    ? 'px-20'
    : 'px-6 sm:px-8 md:px-[10vw] lg:px-[14vw] xl:px-[18vw]';

  // 잠금 버튼 권한 체크
  const canLockDocument = currentDocument && user ? hasWritePermission(currentDocument, user) : false;

  return (
    <div className="flex flex-col w-full">
      <div className={`flex relative justify-between items-center pt-12 pb-6 ${paddingClasses}`}>
        <input
          type="text"
          value={title}
          onChange={onTitleChange}
          onKeyDown={onTitleKeyDown}
          placeholder="제목 없음"
          className="w-full text-3xl font-bold bg-transparent border-none outline-none"
          disabled={isReadOnly}
        />
        {/* 문서 경로/공유/저장 상태/권한자 이니셜 영역을 fixed로 분리 */}
        <div
          className="flex fixed top-0 left-64 right-0 items-center justify-between px-4 py-2 bg-white"
          style={{ zIndex: Z_INDEX.FIXED }}
        >
          {/* 경로 표시 및 잠금 버튼 - 왼쪽 끝 */}
          <div className="flex items-center gap-3">
            {path && path.length >= 1 && (
              <div className="text-sm text-gray-700">
                {path.map((doc, idx) => (
                  <Fragment key={doc.id}>
                    <span onClick={() => onPathClick(doc.id)} className="p-1 rounded-md cursor-pointer hover:bg-gray-100">
                      {doc.title}
                    </span>
                    {idx < path.length - 1 && <span className="mx-1 select-none">/</span>}
                  </Fragment>
                ))}
              </div>
            )}
            {/* 잠금 버튼 */}
            {currentDocument && onLockToggle && (
              <Tooltip
                content={!canLockDocument ? "문서를 잠금/해제할 권한이 없습니다" : null}
                side="bottom"
              >
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-sm text-gray-700 flex items-center gap-1"
                  onClick={onLockToggle}
                  disabled={!canLockDocument}
                >
                  {currentDocument.isLocked ? (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>잠금 해제</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>잠금</span>
                    </>
                  )}
                </Button>
              </Tooltip>
            )}
          </div>
          {/* 오른쪽 끝 요소들 */}
          <div className="flex items-center space-x-2">
            {/* 권한자 이니셜 아이콘 목록 */}
            <div className="flex items-center mr-4">
              {currentDocument?.permissions?.map((p, idx) => {
                const isPresent = viewers?.some(v => String(v.userId) === String(p.userId));
                // userId와 email을 조합하여 고유한 key 생성 (같은 userId가 중복될 수 있으므로)
                const uniqueKey = `${p.userId}-${p.email || ''}-${idx}`;
                return (
                  <div key={uniqueKey} className={isPresent ? 'opacity-100' : 'opacity-40'}>
                    <UserBadge name={p.name} email={p.email} profileImageUrl={p.profileImageUrl} size={32} showLabel={false} />
                  </div>
                );
              })}
            </div>
            <span
              style={{ whiteSpace: 'nowrap', margin: '0 8px' }}
              className={
                (connectionStatus === 'error' || connectionStatus === 'disconnected' ? 'text-red-500' :
                  connectionStatus === 'connecting' ? 'text-orange-500' :
                    saveStatus === 'saving' ? 'text-blue-500' :
                      saveStatus === 'error' ? 'text-red-500' :
                        'text-gray-700') + ' text-sm'
              }
            >
              {connectionStatus === 'error' || connectionStatus === 'disconnected' ? '연결 끊김' :
                connectionStatus === 'connecting' ? '재연결 중...' :
                  saveStatus === 'saving' ? '저장 중...' :
                    saveStatus === 'error' ? '저장 실패' :
                      saveStatus === 'unsaved' ? '저장 대기' : '저장됨'}
            </span>
            {/* 읽기 전용이 아닐 때만 공유 버튼 노출 */}
            {!isReadOnly && (
              <Button
                ref={shareButtonRef}
                size="sm"
                variant="ghost"
                className="text-sm text-gray-700"
                onClick={() => setShowShareModal((v) => !v)}
              >
                공유
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-sm text-gray-700"
              onClick={() => setShowVersionHistory(true)}
            >
              버전 기록
            </Button>
          </div>
        </div>
        {/* 공유 팝오버 */}
        {showShareModal && !isReadOnly && (
          <DocumentSharePopover
            open={showShareModal}
            onClose={() => setShowShareModal(false)}
            workspaceId={currentWorkspace?.id}
            documentId={currentDocument?.id}
            anchorRef={shareButtonRef}
          />
        )}
      </div>
      {showVersionHistory && (
        <VersionHistoryPanel
          onClose={handleCloseVersions}
          workspaceId={currentWorkspace?.id}
          documentId={currentDocument?.id}
        />
      )}
    </div>
  );
}

