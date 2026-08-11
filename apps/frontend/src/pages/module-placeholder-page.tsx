import { ArrowRight, Blocks, CheckCircle2 } from 'lucide-react';

interface ModulePlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function ModulePlaceholderPage({ eyebrow, title, description }: ModulePlaceholderPageProps) {
  return (
    <section aria-labelledby="page-title">
      <div className="flex flex-col gap-3 border-b border-[var(--zeva-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--zeva-accent)]">
            {eyebrow}
          </p>
          <h1 id="page-title" className="mt-1.5 text-2xl font-semibold tracking-tight text-[#edf1ee]">
            {title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--zeva-text-muted)]">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-[#9fa8a1]">
          <CheckCircle2 className="size-4 text-[var(--zeva-accent)]" aria-hidden="true" />
          Uygulama kabuğu hazır
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-h-72 rounded-xl border border-[var(--zeva-border)] bg-[var(--zeva-surface)] p-5 sm:p-6">
          <div className="flex size-10 items-center justify-center rounded-lg border border-[#35433a] bg-[#1b241e] text-[var(--zeva-accent-strong)]">
            <Blocks className="size-5" aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-base font-semibold">Modül altyapısı hazır</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--zeva-text-muted)]">
            Bu aşamada yalnızca navigasyon ve uygulama yerleşimi oluşturuldu. Gerçek veriler, tablolar ve işlem formları ilgili feature branch'lerinde eklenecek.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs font-medium text-[#8e9790]">
            Sonraki geliştirme aşaması
            <ArrowRight className="size-4" aria-hidden="true" />
          </div>
        </div>

        <aside className="rounded-xl border border-[var(--zeva-border)] bg-[var(--zeva-surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f9891]">Sistem durumu</p>
          <dl className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-[var(--zeva-text-muted)]">Navigasyon</dt>
              <dd className="text-xs font-medium text-[#b9d4c1]">Hazır</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-[var(--zeva-text-muted)]">API bağlantısı</dt>
              <dd className="text-xs font-medium text-[#b9d4c1]">Yapılandırıldı</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-[var(--zeva-text-muted)]">Domain verileri</dt>
              <dd className="text-xs font-medium text-[var(--zeva-warning)]">Bekliyor</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
