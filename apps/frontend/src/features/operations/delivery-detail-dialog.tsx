import { Ban, Download, LoaderCircle, X } from 'lucide-react';
import { useMemo } from 'react';

import { Skeleton } from '../../components/feedback/skeleton';
import { useDeliveryDetail } from './operation.queries';
import { packageTypeLabels, type DeliveryPackage } from './operation.types';
import { reportingApi } from '../reporting/reporting.api';
import { usePdfDownload } from '../reporting/use-pdf-download';

const formatDate = (value: string) => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function DeliveryDetailDialog({ id, onClose, onCancel }: { id: string; onClose: () => void; onCancel: (id: string) => void }) {
  const query = useDeliveryDetail(id);
  const item = query.data;
  const pdf = usePdfDownload();
  const groups = useMemo(() => {
    const grouped = new Map<string, { workOrder: DeliveryPackage['workOrder']; packages: DeliveryPackage[] }>();
    for (const entry of item?.packages ?? []) {
      const group = grouped.get(entry.workOrderId) ?? { workOrder: entry.workOrder, packages: [] };
      group.packages.push(entry);
      grouped.set(entry.workOrderId, group);
    }
    return [...grouped.values()];
  }, [item?.packages]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/65">
      <section role="dialog" aria-modal="true" aria-labelledby="delivery-detail-title" tabIndex={-1} autoFocus onKeyDown={(event) => event.key === 'Escape' && onClose()} className="h-full w-full max-w-xl overflow-y-auto border-l border-[var(--zeva-border-strong)] bg-[var(--zeva-surface)] p-5 shadow-2xl sm:p-6">
        <header className="flex justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--zeva-accent)]">Teslimat detayı</p><h2 id="delivery-detail-title" className="mt-1 text-xl font-semibold text-white">{item?.customer.name ?? 'Teslimat yükleniyor'}</h2></div>
          <div className="flex gap-2">{item ? <button type="button" disabled={pdf.pendingKey === item.id} onClick={() => void pdf.download(item.id, () => reportingApi.deliveryPdf(item.id))} className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--zeva-border-strong)] px-3 text-xs font-semibold disabled:opacity-50">{pdf.pendingKey === item.id ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />} Teslimat Listesini İndir</button> : null}<button type="button" aria-label="Teslimat detayını kapat" onClick={onClose} className="grid size-10 place-items-center rounded-lg text-[#929b94]"><X className="size-5" /></button></div>
        </header>
        {query.isPending ? <div aria-label="Teslimat detayı yükleniyor" className="mt-5 space-y-3"><Skeleton className="h-28" /><Skeleton className="h-48" /></div> : query.isError || !item ? <p role="alert" className="mt-5 rounded-lg border border-[#5f3d3d] bg-[#261a1a] p-4 text-sm text-[#e4a0a0]">Teslimat detayı yüklenemedi.</p> : (
          <div className="mt-5 space-y-5">
            <div className="rounded-xl border border-[var(--zeva-border)] bg-[#111512] p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-white">{item.customer.name}</p><p className="mt-1 text-sm text-[var(--zeva-text-muted)]">{formatDate(item.deliveredAt)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.cancelledAt ? 'bg-[#342020] text-[#e7a3a3]' : 'bg-[#203326] text-[#a8d2b2]'}`}>{item.cancelledAt ? 'İptal Edildi' : 'Tamamlandı'}</span></div></div>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3"><div><dt className="text-xs text-[var(--zeva-text-muted)]">İş emri</dt><dd className="mt-1 text-sm font-semibold text-white">{item.workOrderCount}</dd></div><div><dt className="text-xs text-[var(--zeva-text-muted)]">Paket</dt><dd className="mt-1 text-sm font-semibold text-white">{item.packageCount}</dd></div><div><dt className="text-xs text-[var(--zeva-text-muted)]">Toplam adet</dt><dd className="mt-1 text-sm font-semibold text-white">{item.totalQuantity.toLocaleString('tr-TR')}</dd></div><div className="col-span-2 sm:col-span-3"><dt className="text-xs text-[var(--zeva-text-muted)]">Teslim alan</dt><dd className="mt-1 text-sm text-white">{item.receiverName ?? '—'}</dd></div><div className="col-span-2 sm:col-span-3"><dt className="text-xs text-[var(--zeva-text-muted)]">Notlar</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-white">{item.notes ?? '—'}</dd></div></dl>
            <div><h3 className="text-sm font-semibold text-white">Teslim edilen paketler</h3><div className="mt-2 space-y-3">{groups.map((group) => <section key={group.workOrder.id} className="rounded-xl border border-[var(--zeva-border)] bg-[#111512] p-3"><div className="flex items-start justify-between gap-3"><div><h4 className="font-medium text-white">{group.workOrder.productName}</h4><p className="mt-1 text-xs text-[var(--zeva-text-muted)]">{group.packages.length} paket · {group.packages.reduce((sum, entry) => sum + entry.quantity, 0).toLocaleString('tr-TR')} adet</p></div></div><div className="mt-3 space-y-2">{group.packages.map((entry) => <div key={entry.id} className="flex justify-between rounded-lg border border-[var(--zeva-border)] bg-[#171b18] px-3 py-2.5 text-sm"><span className="text-[#d6dcd7]">{packageTypeLabels[entry.type]} #{entry.sequenceNo}</span><strong className="text-white">{entry.quantity.toLocaleString('tr-TR')} adet</strong></div>)}</div></section>)}</div></div>
            {item.cancelledAt ? <p className="rounded-lg border border-[#583b3b] bg-[#281b1b] p-3 text-sm text-[#dda0a0]">İptal tarihi: {formatDate(item.cancelledAt)}</p> : <button type="button" onClick={() => onCancel(item.id)} className="flex min-h-10 items-center gap-2 rounded-lg border border-[#603f3f] px-4 text-sm font-semibold text-[#e5a0a0] hover:bg-[#2b1d1d]"><Ban className="size-4" /> Teslimatı iptal et</button>}
          </div>
        )}
      </section>
    </div>
  );
}
