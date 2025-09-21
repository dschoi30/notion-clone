import React, { Fragment, useCallback } from 'react';
import UserBadge from '@/components/documents/shared/UserBadge';
import { Button } from '@/components/ui/button';
import VersionHistoryPanel from './VersionHistoryPanel';
import DocumentSharePopover from './DocumentSharePopover';

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
  user,
  currentWorkspace,
  path,
  onPathClick
}) {
  const [showVersions, setShowVersions] = React.useState(false);
  const handleCloseVersions = useCallback(() => setShowVersions(false), []);
  const isTableView = currentDocument?.viewType === 'TABLE';
  const paddingClasses = isTableView
    ? 'px-20'
    : 'px-6 sm:px-8 md:px-[10vw] lg:px-[14vw] xl:px-[18vw]';
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
        <div className="flex fixed top-0 left-64 right-0 z-50 items-center justify-between px-4 py-2 bg-white backdrop-blur-sm">
          {/* 경로 표시 - 왼쪽 끝 */}
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
          {/* 오른쪽 끝 요소들 */}
          <div className="flex items-center space-x-2">
            {/* 권한자 이니셜 아이콘 목록 */}
            <div className="flex items-center mr-4">
              {currentDocument?.permissions?.map((p) => {
                const isPresent = viewers?.some(v => String(v.userId) === String(p.userId));
                return (
                  <div key={p.userId} className={isPresent ? 'opacity-100' : 'opacity-40'}>
                    <UserBadge name={p.name} email={p.email} profileImageUrl={p.profileImageUrl} size={32} showLabel={false} xOffset={-256} />
                  </div>
                );
              })}
            </div>
            <span
              style={{ whiteSpace: 'nowrap', margin: '0 8px' }}
              className={
                (saveStatus === 'saving' ? 'text-blue-500' :
                saveStatus === 'error' ? 'text-red-500' :
                'text-gray-700') + ' text-sm'
              }
            >
              {saveStatus === 'saving' ? '저장 중...' :
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
              onClick={() => setShowVersions(true)}
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
      {showVersions && (
        <VersionHistoryPanel
          onClose={handleCloseVersions}
          workspaceId={currentWorkspace?.id}
          documentId={currentDocument?.id}
        />
      )}
    </div>
  );
} 