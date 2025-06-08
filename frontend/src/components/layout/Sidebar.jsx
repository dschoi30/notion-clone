import React from 'react';
import WorkspaceList from '@/components/workspace/WorkspaceList';
import DocumentList from '@/components/documents/DocumentList';
import TrashButton from './TrashButton';
import Notifications from '@/components/notifications/Notifications';

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-64 h-screen border-r border-gray-200"
        style={{ backgroundColor: '#F8F8F7' }}>
      <WorkspaceList />
      <Notifications />
      <DocumentList />
      <TrashButton />
    </aside>
  );
} 