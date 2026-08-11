import { Factory, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { navigationItems } from '../../app/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Menüyü kapat"
        className={`fixed inset-0 z-30 bg-black/55 transition-opacity duration-200 lg:hidden ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-68 flex-col border-r border-[var(--zeva-border)] bg-[var(--zeva-surface)] transition-transform duration-200 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-18 items-center justify-between border-b border-[var(--zeva-border)] px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg border border-[#42614d] bg-[#1d2b21] text-[var(--zeva-accent-strong)]">
              <Factory className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-base font-semibold tracking-tight">Zeva</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--zeva-text-muted)]">
                Atölye yönetimi
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="grid size-9 place-items-center rounded-lg text-[var(--zeva-text-muted)] hover:bg-[var(--zeva-surface-hover)] hover:text-[var(--zeva-text)] lg:hidden"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Ana navigasyon">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#737c75]">
            Çalışma alanı
          </p>
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group flex min-h-10 items-center gap-3 rounded-lg border px-3 text-sm font-medium transition-colors duration-180 ${
                        isActive
                          ? 'border-[#354c3d] bg-[#1d2921] text-[#dce9df]'
                          : 'border-transparent text-[var(--zeva-text-muted)] hover:bg-[var(--zeva-surface-hover)] hover:text-[var(--zeva-text)]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`size-[18px] shrink-0 ${
                            isActive ? 'text-[var(--zeva-accent-strong)]' : 'text-[#7f8981] group-hover:text-[#aab3ac]'
                          }`}
                          aria-hidden="true"
                        />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-[var(--zeva-border)] p-4">
          <div className="rounded-lg border border-[var(--zeva-border)] bg-[#101411] px-3 py-3">
            <div className="flex items-center gap-2 text-xs font-medium text-[#c8cec9]">
              <span className="size-2 rounded-full bg-[#79b78c]" aria-hidden="true" />
              İş emri yönetimi aktif
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-[#737c75]">Güvenli çalışma alanı</p>
          </div>
        </div>
      </aside>
    </>
  );
}
