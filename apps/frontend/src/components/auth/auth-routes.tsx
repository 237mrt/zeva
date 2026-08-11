import { RefreshCw } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks/use-auth';
import { Skeleton } from '../feedback/skeleton';

function SessionLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--zeva-bg)] p-6" role="status">
      <section className="w-full max-w-sm rounded-xl border border-[var(--zeva-border)] bg-[var(--zeva-surface)] p-5 shadow-2xl shadow-black/20">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-44" />
          </div>
        </div>
        <Skeleton className="mt-5 h-10 w-full rounded-lg" />
        <span className="sr-only">Oturum doğrulanıyor...</span>
      </section>
    </main>
  );
}

function SessionError() {
  const { refreshSession } = useAuth();

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--zeva-bg)] p-6">
      <section className="w-full max-w-md rounded-xl border border-[var(--zeva-border)] bg-[var(--zeva-surface)] p-6 text-center shadow-2xl shadow-black/20">
        <h1 className="text-lg font-semibold">Oturum doğrulanamadı</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--zeva-text-muted)]">
          Sunucu bağlantısı kurulamadı. Bağlantınızı kontrol edip tekrar deneyin.
        </p>
        <button
          type="button"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--zeva-accent)] px-4 py-2 text-sm font-semibold text-[#0d140f] hover:bg-[var(--zeva-accent-strong)]"
          onClick={() => {
            void refreshSession();
          }}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Tekrar dene
        </button>
      </section>
    </main>
  );
}

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <SessionLoading />;
  }

  if (status === 'error') {
    return <SessionError />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <SessionLoading />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
