import WorkspaceList from '@/components/workspace/WorkspaceList';
import DocumentList from '@/components/documents/DocumentList';
import TrashButton from './TrashButton';
import Notifications from '@/components/notifications/Notifications';
import SearchButton from './SearchButton';
import { Z_INDEX } from '@/constants/zIndex';

export default function Sidebar() {
  return (
    <aside
      className="flex fixed top-0 left-0 flex-col w-64 h-screen border-r border-gray-200"
      style={{
        backgroundColor: '#F8F8F7',
        height: '100vh',
        zIndex: Z_INDEX.SIDEBAR
      }}
    >
      <WorkspaceList />
      <SearchButton />
      <Notifications />
      <DocumentList />
      <TrashButton />
    </aside>
  );
}

