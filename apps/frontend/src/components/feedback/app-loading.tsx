export function AppLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--zeva-bg)]" role="status">
      <div className="flex items-center gap-3 text-sm text-[var(--zeva-text-muted)]">
        <span className="size-4 animate-spin rounded-full border-2 border-[var(--zeva-border-strong)] border-t-[var(--zeva-accent)]" />
        Zeva hazırlanıyor...
      </div>
    </div>
  );
}
