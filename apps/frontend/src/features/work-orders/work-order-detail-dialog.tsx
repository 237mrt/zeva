import { Pencil, X } from 'lucide-react';

import { Skeleton } from '../../components/feedback/skeleton';
import { usePackageList } from '../operations/operation.queries';
import { workOrderTypeLabels } from '../customers/customer.types';
import { useWorkOrderDetail } from './work-order.queries';
import { WorkOrderStatusBadge } from './work-order-status-badge';
import type { WorkOrder } from './work-order.types';

interface WorkOrderDetailDialogProps {
  workOrderId: string;
  onClose: () => void;
  onEdit: (workOrder: WorkOrder) => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | number | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#737c75]">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#dbe1dc]">{value ?? '—'}</dd>
    </div>
  );
}

export function WorkOrderDetailDialog({
  workOrderId,
  onClose,
  onEdit,
}: WorkOrderDetailDialogProps) {
  const detailQuery = useWorkOrderDetail(workOrderId);
  const workOrder = detailQuery.data;
  const packageQuery = usePackageList(workOrderId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/65" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-order-detail-title"
        tabIndex={-1}
        autoFocus
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-[var(--zeva-border-strong)] bg-[var(--zeva-surface)] shadow-2xl animate-[panel-in_180ms_ease-out]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--zeva-border)] bg-[var(--zeva-surface)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--zeva-accent)]">İş emri detayı</p>
            <h2 id="work-order-detail-title" className="mt-1 text-xl font-semibold text-[#edf1ee]">
              {workOrder?.productName ?? 'İş emri yükleniyor'}
            </h2>
          </div>
          <div className="flex gap-2">
            {workOrder ? (
              <button type="button" onClick={() => onEdit(workOrder)} className="flex h-9 items-center gap-2 rounded-lg border border-[var(--zeva-border-strong)] px-3 text-sm text-[#d3d9d4] hover:bg-[var(--zeva-surface-hover)]">
                <Pencil className="size-4" aria-hidden="true" /> Düzenle
              </button>
            ) : null}
            <button type="button" aria-label="Detayı kapat" onClick={onClose} className="grid size-9 place-items-center rounded-lg text-[var(--zeva-text-muted)] hover:bg-[var(--zeva-surface-hover)]">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          {detailQuery.isPending ? (
            <div className="space-y-3" aria-label="İş emri detayı yükleniyor">
              <Skeleton className="h-28" />
              <Skeleton className="h-40" />
            </div>
          ) : detailQuery.isError || !workOrder ? (
            <div role="alert" className="rounded-xl border border-[#5f3d3d] bg-[#261a1a] p-4 text-sm text-[#e4a0a0]">İş emri detayı yüklenemedi.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--zeva-border)] bg-[#111512] p-4">
                <div>
                  <p className="text-xs text-[var(--zeva-text-muted)]">Müşteri</p>
                  <p className="mt-1 font-semibold text-[#e5eae6]">{workOrder.customer.name}</p>
                </div>
                <WorkOrderStatusBadge status={workOrder.status} />
              </div>
              <dl className="grid gap-4 rounded-xl border border-[var(--zeva-border)] bg-[#111512] p-5 sm:grid-cols-2">
                <Detail label="Hizmet türü" value={workOrderTypeLabels[workOrder.type]} />
                <Detail label="Toplam adet" value={workOrder.totalQuantity.toLocaleString('tr-TR')} />
                <Detail label="Birim fiyat" value={`${workOrder.unitPrice} TL`} />
                <Detail label="Toplam tutar" value={`${workOrder.totalAmount} TL`} />
                <Detail label="Alınma tarihi" value={formatDate(workOrder.receivedAt)} />
                <Detail label="Termin tarihi" value={workOrder.dueAt ? formatDate(workOrder.dueAt) : null} />
                <Detail label="Notlar" value={workOrder.notes} wide />
                <Detail label="Oluşturulma" value={formatDate(workOrder.createdAt)} />
                <Detail label="Son güncelleme" value={formatDate(workOrder.updatedAt)} />
              </dl>
              <section className="rounded-xl border border-[var(--zeva-border)] bg-[#111512] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#737c75]">Paketleme</p>
                {packageQuery.isPending ? <Skeleton className="mt-3 h-14" /> : packageQuery.data ? (
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div><p className="font-semibold text-[#e4e9e5]">{packageQuery.data.summary.packageCount} paket</p><p className="mt-1 text-sm text-[var(--zeva-text-muted)]">{packageQuery.data.summary.packagedQuantity.toLocaleString('tr-TR')} / {packageQuery.data.summary.workOrderTotalQuantity.toLocaleString('tr-TR')} adet paketlendi · {packageQuery.data.summary.deliveredQuantity.toLocaleString('tr-TR')} adet teslim edildi</p></div>
                    <a href={`/utu-paket?workOrderId=${workOrderId}`} className="text-sm font-semibold text-[var(--zeva-accent-strong)] hover:text-white">Ütü ve Paketleme bölümünde görüntüle</a>
                  </div>
                ) : <p className="mt-2 text-sm text-[var(--zeva-text-muted)]">Paketleme bilgisi yüklenemedi.</p>}
              </section>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
