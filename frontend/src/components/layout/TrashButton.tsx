import { useState, useRef } from 'react';
import TrashModal from './TrashModal';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { TrashIcon } from 'lucide-react';
import { useDocument } from '@/contexts/DocumentContext';

export default function TrashButton() {
  const [trashOpen, setTrashOpen] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const trashAreaRef = useRef<HTMLDivElement>(null);
  const { fetchDocuments } = useDocument();

  const handleRestore = () => {
    fetchDocuments();
  };

  return (
    <>
      <div
        ref={trashAreaRef}
        className="px-4 py-2 mt-auto border-t border-gray-100 cursor-pointer select-none"
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
        onRestore={handleRestore}
      />
    </>
  );
}

