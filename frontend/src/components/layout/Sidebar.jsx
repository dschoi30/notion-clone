import React, { useState, useRef } from 'react';
import WorkspaceList from '@/components/workspace/WorkspaceList';
import DocumentList from '@/components/documents/DocumentList';
import TrashModal from './TrashModal';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { TrashIcon } from 'lucide-react';

export default function Sidebar() {
  const [trashOpen, setTrashOpen] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const trashAreaRef = useRef(null);

  return (
    <aside className="flex flex-col w-64 h-screen bg-white border-r border-gray-200">
      <WorkspaceList />
      <DocumentList />
      <div
        ref={trashAreaRef}
        className="p-4 mt-auto border-t border-gray-100 cursor-pointer select-none"
        onClick={() => currentWorkspace && setTrashOpen(true)}
        tabIndex={0}
        role="button"
        aria-label="휴지통 열기"
      >
        <div className="flex items-center gap-2 text-gray-500 transition-colors hover:text-red-500">
          <TrashIcon className="w-5 h-5" />
          <span>휴지통</span>
        </div>
      </div>
      <TrashModal
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        workspaceId={currentWorkspace?.id}
        anchorRef={trashAreaRef}
      />
    </aside>
  );
} 