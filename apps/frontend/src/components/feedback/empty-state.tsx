import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <section
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--zeva-border-strong)] bg-[#111512] px-5 text-center ${
        compact ? 'min-h-48 py-7' : 'min-h-64 py-10'
      }`}
    >
      <span className="grid size-11 place-items-center rounded-lg border border-[var(--zeva-border)] bg-[var(--zeva-surface)] text-[#89938b]">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-sm font-semibold text-[#e2e7e3]">{title}</h2>
      <p className="mt-1.5 max-w-sm text-xs leading-5 text-[var(--zeva-text-muted)]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
