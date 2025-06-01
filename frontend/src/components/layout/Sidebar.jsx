import React from 'react';
import WorkspaceList from '@/components/workspace/WorkspaceList';
import DocumentList from '@/components/documents/DocumentList';
import TrashButton from './TrashButton';

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-64 h-screen bg-white border-r border-gray-200">
      <WorkspaceList />
      <DocumentList />
      <TrashButton />
    </aside>
  );
} 