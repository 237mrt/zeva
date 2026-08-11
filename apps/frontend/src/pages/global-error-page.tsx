import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

export function GlobalErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? 'İstenen sayfa bulunamadı.'
    : 'Sayfa yüklenirken beklenmeyen bir hata oluştu.';

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--zeva-bg)] p-6 text-center">
      <div>
        <p className="text-sm font-medium text-[var(--zeva-danger)]">Bir sorun oluştu</p>
        <h1 className="mt-2 text-xl font-semibold">{message}</h1>
        <a
          href="/"
          className="mt-5 inline-flex rounded-lg border border-[var(--zeva-border-strong)] px-4 py-2 text-sm hover:bg-[var(--zeva-surface-hover)]"
        >
          Ana sayfaya dön
        </a>
      </div>
    </main>
  );
}
