import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { Sidebar } from '../components/layout/sidebar';
import { Topbar } from '../components/layout/topbar';

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isSidebarOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen bg-[var(--zeva-bg)]">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="min-h-screen lg:pl-68">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto max-w-[1600px] animate-[page-in_180ms_ease-out]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
