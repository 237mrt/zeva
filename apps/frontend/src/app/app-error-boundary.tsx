import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<PropsWithChildren, AppErrorBoundaryState> {
  public override state: AppErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Uygulama oluşturulurken beklenmeyen bir hata oluştu.', error, errorInfo);
  }

  public override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="grid min-h-screen place-items-center bg-[var(--zeva-bg)] p-6">
        <section className="w-full max-w-md rounded-xl border border-[var(--zeva-border)] bg-[var(--zeva-surface)] p-6 text-center shadow-2xl shadow-black/20">
          <AlertTriangle className="mx-auto size-9 text-[var(--zeva-danger)]" aria-hidden="true" />
          <h1 className="mt-4 text-lg font-semibold">Uygulama yüklenemedi</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--zeva-text-muted)]">
            Beklenmeyen bir sorun oluştu. Sayfayı yenileyerek tekrar deneyebilirsiniz.
          </p>
          <button
            type="button"
            className="mt-5 rounded-lg bg-[var(--zeva-accent)] px-4 py-2 text-sm font-semibold text-[#0d140f] hover:bg-[var(--zeva-accent-strong)]"
            onClick={() => window.location.reload()}
          >
            Sayfayı yenile
          </button>
        </section>
      </main>
    );
  }
}
