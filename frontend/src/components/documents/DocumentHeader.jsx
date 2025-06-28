import React, { Fragment } from 'react';
import { Button } from '@/components/ui/button';
import DocumentSharePopover from './DocumentSharePopover';

export default function DocumentHeader({
  title,
  onTitleChange,
  onTitleKeyDown,
  saveStatus,
  isGuest,
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
  return (
    <div className="flex flex-col w-full">
      {/* 경로 표시 */}
      {path && path.length >= 1 && (
        <div className="mb-1 text-sm text-gray-700">
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
      <div className="flex relative justify-between items-center px-20 pt-12 pb-4">
        <input
          type="text"
          value={title}
          onChange={onTitleChange}
          onKeyDown={onTitleKeyDown}
          placeholder="제목 없음"
          className="w-full text-3xl font-bold bg-transparent border-none outline-none"
          disabled={isGuest}
        />
        {/* 공유/저장 상태/권한자 이니셜 영역을 fixed로 분리 */}
        <div className="flex fixed top-2 right-4 z-50 items-center px-2 py-1 space-x-2">
          {/* 권한자 이니셜 아이콘 목록 */}
          <div className="flex items-center mr-2">
            {currentDocument?.permissions?.map((p) => {
              const isPresent = viewers?.some(v => String(v.userId) === String(p.userId));
              return (
                <div
                  key={p.userId}
                  className={
                    'flex items-center justify-center w-8 h-8 mr-1 text-base font-bold rounded-full select-none bg-blue-500 text-white ring-2 ring-blue-400 ' +
                    (isPresent ? 'opacity-100' : 'opacity-40')
                  }
                  title={p.name || p.email || ''}
                >
                  {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                </div>
              );
            })}
          </div>
          <span
            style={{ whiteSpace: 'nowrap' }}
            className={
              (saveStatus === 'saving' ? 'text-blue-500' :
              saveStatus === 'error' ? 'text-red-500' :
              'text-gray-700') + ' ml-2 text-sm'
            }
          >
            {saveStatus === 'saving' ? '저장 중...' :
            saveStatus === 'error' ? '저장 실패' :
            saveStatus === 'unsaved' ? '저장 대기' : '저장됨'}
          </span>
          {/* 게스트가 아닐 때만 공유 버튼 노출 */}
          {!isGuest && (
            <Button
              ref={shareButtonRef}
              size="sm"
              variant="ghost"
              className="ml-2"
              onClick={() => setShowShareModal((v) => !v)}
            >
              공유
            </Button>
          )}
        </div>
        {/* 공유 팝오버 */}
        {showShareModal && !isGuest && (
          <DocumentSharePopover
            open={showShareModal}
            onClose={() => setShowShareModal(false)}
            workspaceId={currentWorkspace?.id}
            documentId={currentDocument?.id}
            anchorRef={shareButtonRef}
          />
        )}
      </div>
    </div>
  );
} 