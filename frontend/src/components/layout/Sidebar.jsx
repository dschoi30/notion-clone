import React from 'react';
import WorkspaceList from '@/components/workspace/WorkspaceList';
import DocumentList from '@/components/documents/DocumentList';

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen border-r border-gray-200 bg-white flex flex-col">
      <WorkspaceList />
      <DocumentList />
    </aside>
  );
} 