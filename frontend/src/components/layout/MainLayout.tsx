// components/layout/MainLayout.tsx
import Sidebar from './Sidebar';
import AppRouter from './AppRouter';
import { Toaster } from '@/components/ui/toaster';

const MainLayout = () => {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 pl-64">
        <AppRouter />
      </div>
      <Toaster />
    </div>
  );
};

export default MainLayout;

