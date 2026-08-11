import { LogOut, Menu, Search } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { navigationItems } from '../../app/navigation';
import { useAuth } from '../../hooks/use-auth';
import { useToast } from '../../hooks/use-toast';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const currentItem = navigationItems.find((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path),
  );
  const initials =
    user?.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase('tr-TR'))
      .join('') || 'ZV';

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
      toast.success('Oturum kapatıldı', 'Güvenli şekilde çıkış yaptınız.');
      void navigate('/login', { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Çıkış işlemi tamamlanamadı. Lütfen tekrar deneyin.';
      toast.error('Çıkış yapılamadı', message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-18 items-center justify-between border-b border-[var(--zeva-border)] bg-[color:var(--zeva-bg)]/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Menüyü aç"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--zeva-border)] text-[var(--zeva-text-muted)] hover:bg-[var(--zeva-surface-hover)] hover:text-[var(--zeva-text)] lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#e4e8e5]">{currentItem?.label ?? 'Zeva'}</p>
          <p className="hidden text-xs text-[var(--zeva-text-muted)] sm:block">Atölye çalışma alanı</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="hidden h-9 items-center gap-2 rounded-lg border border-[var(--zeva-border)] bg-[var(--zeva-surface)] px-3 text-xs text-[var(--zeva-text-muted)] hover:border-[var(--zeva-border-strong)] hover:text-[var(--zeva-text)] md:flex"
          aria-label="Hızlı arama"
        >
          <Search className="size-4" aria-hidden="true" />
          Hızlı arama
          <kbd className="ml-3 rounded border border-[var(--zeva-border)] bg-[#0e110f] px-1.5 py-0.5 font-sans text-[10px] text-[#727a74]">
            Ctrl K
          </kbd>
        </button>
        <div className="h-7 w-px bg-[var(--zeva-border)]" aria-hidden="true" />
        <div className="flex items-center gap-2 rounded-lg p-1.5 pr-2">
          <span className="grid size-7 place-items-center rounded-md bg-[#29362d] text-[11px] font-bold text-[#b9d4c1]">
            {initials}
          </span>
          <span className="hidden max-w-40 truncate text-xs font-medium text-[#cbd1cc] sm:block">
            {user?.name ?? 'Yönetici'}
          </span>
        </div>
        <button
          type="button"
          disabled={isLoggingOut}
          className="flex h-9 items-center gap-2 rounded-lg border border-[var(--zeva-border)] px-2.5 text-xs font-medium text-[var(--zeva-text-muted)] hover:border-[#5f3d3d] hover:bg-[#261a1a] hover:text-[#e4a0a0] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Çıkış yap"
          onClick={() => {
            void handleLogout();
          }}
        >
          {isLoggingOut ? (
            <span
              className="size-4 animate-spin rounded-full border-2 border-[#879088] border-t-transparent"
              aria-hidden="true"
            />
          ) : (
            <LogOut className="size-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">Çıkış</span>
        </button>
      </div>
    </header>
  );
}
