import {
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FilterX,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '../../components/feedback/empty-state';
import { Skeleton } from '../../components/feedback/skeleton';
import { useConfirmation } from '../../hooks/use-confirmation';
import { useToast } from '../../hooks/use-toast';
import { useCustomerList } from '../customers/customer.queries';
import { workOrderTypeLabels, workOrderTypes } from '../customers/customer.types';
import { WorkOrderDetailDialog } from './work-order-detail-dialog';
import { WorkOrderFormDialog } from './work-order-form-dialog';
import {
  useCreateWorkOrder,
  useDeleteWorkOrder,
  useRestoreWorkOrder,
  useUpdateWorkOrder,
  useUpdateWorkOrderStatus,
  useWorkOrderList,
} from './work-order.queries';
import { WorkOrderStatusBadge } from './work-order-status-badge';
import type {
  WorkOrder,
  WorkOrderListParams,
  WorkOrderMutationInput,
  WorkOrderStatus,
  WorkOrderType,
} from './work-order.types';
import { workOrderStatuses, workOrderStatusLabels } from './work-order.types';

const pageSize = 20;

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value));
}

export function WorkOrderPage() {
  const toast = useToast();
  const { confirm } = useConfirmation();
  const [showTrash, setShowTrash] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [customerFilterSearch, setCustomerFilterSearch] = useState('');
  const [debouncedCustomerFilterSearch, setDebouncedCustomerFilterSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [type, setType] = useState<WorkOrderType | ''>('');
  const [status, setStatus] = useState<WorkOrderStatus | ''>('');
  const [page, setPage] = useState(1);
  const [formWorkOrder, setFormWorkOrder] = useState<WorkOrder | null | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalized = search.trim();
      if (normalized === debouncedSearch) return;
      setDebouncedSearch(normalized);
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [debouncedSearch, search]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedCustomerFilterSearch(customerFilterSearch.trim()),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [customerFilterSearch]);

  const listParams = useMemo<WorkOrderListParams>(
    () => ({
      q: debouncedSearch,
      page,
      pageSize,
      deleted: showTrash,
      ...(customerId ? { customerId } : {}),
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    }),
    [customerId, debouncedSearch, page, showTrash, status, type],
  );
  const listQuery = useWorkOrderList(listParams);
  const customerFilterQuery = useCustomerList({
    q: debouncedCustomerFilterSearch,
    page: 1,
    pageSize: 20,
    deleted: false,
  });
  const createMutation = useCreateWorkOrder();
  const updateMutation = useUpdateWorkOrder();
  const statusMutation = useUpdateWorkOrderStatus();
  const deleteMutation = useDeleteWorkOrder();
  const restoreMutation = useRestoreWorkOrder();
  const data = listQuery.data;
  const total = data?.pagination.total ?? 0;
  const lastPage = Math.max(1, data?.pagination.totalPages ?? 1);
  const isPageOutOfRange = Boolean(data) && !listQuery.isPlaceholderData && page > lastPage;
  const isMutating =
    statusMutation.isPending || deleteMutation.isPending || restoreMutation.isPending;
  const hasFilters = Boolean(search || customerId || type || status);

  useEffect(() => {
    if (!data || listQuery.isPlaceholderData || page <= lastPage) return;
    const timer = window.setTimeout(() => {
      setPage((current) => (current > lastPage ? lastPage : current));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [data, lastPage, listQuery.isPlaceholderData, page]);

  const submitWorkOrder = async (input: WorkOrderMutationInput) => {
    try {
      if (formWorkOrder) {
        await updateMutation.mutateAsync({ id: formWorkOrder.id, input });
        toast.success('İş emri güncellendi', `${input.productName} bilgileri kaydedildi.`);
      } else {
        await createMutation.mutateAsync(input);
        toast.success('İş emri oluşturuldu', `${input.productName} iş listesine eklendi.`);
      }
      setFormWorkOrder(undefined);
    } catch {
      // Global mutation feedback keeps the dialog open for retry.
    }
  };

  const changeStatus = async (workOrder: WorkOrder, nextStatus: WorkOrderStatus) => {
    if (nextStatus === workOrder.status) return;
    if (nextStatus === 'CANCELLED') {
      const approved = await confirm({
        title: 'İş emri iptal edilsin mi?',
        description: `${workOrder.productName} durumu İptal olarak değiştirilecek.`,
        confirmLabel: 'İptal durumuna al',
        cancelLabel: 'Vazgeç',
        tone: 'danger',
      });
      if (!approved) return;
    }
    try {
      await statusMutation.mutateAsync({ id: workOrder.id, status: nextStatus });
      toast.success('Durum güncellendi', `İş emri ${workOrderStatusLabels[nextStatus]} durumuna alındı.`);
    } catch {
      // Global mutation feedback reports the error.
    }
  };

  const deleteWorkOrder = async (workOrder: WorkOrder) => {
    const approved = await confirm({
      title: 'İş emri silinsin mi?',
      description: `${workOrder.productName} çöp kutusuna taşınacak.`,
      confirmLabel: 'İş emrini sil',
      cancelLabel: 'Vazgeç',
      tone: 'danger',
    });
    if (!approved) return;
    try {
      await deleteMutation.mutateAsync(workOrder.id);
      if (detailId === workOrder.id) setDetailId(null);
      toast.success('İş emri silindi', `${workOrder.productName} çöp kutusuna taşındı.`);
    } catch {
      // Global mutation feedback reports the error.
    }
  };

  const restoreWorkOrder = async (workOrder: WorkOrder) => {
    try {
      await restoreMutation.mutateAsync(workOrder.id);
      toast.success('İş emri geri yüklendi', `${workOrder.productName} aktif işlere taşındı.`);
    } catch {
      // Global mutation feedback reports the error.
    }
  };

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCustomerFilterSearch('');
    setCustomerId('');
    setType('');
    setStatus('');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--zeva-accent)]">Operasyon</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#eef2ef]">İş Emirleri</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--zeva-text-muted)]">Müşteri işlerini, fiyat snapshotlarını ve üretim durumlarını yönetin.</p>
        </div>
        {!showTrash ? (
          <button type="button" onClick={() => setFormWorkOrder(null)} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--zeva-accent)] px-4 text-sm font-semibold text-[#0d140f] hover:bg-[var(--zeva-accent-strong)]">
            <Plus className="size-4" aria-hidden="true" /> Yeni iş emri
          </button>
        ) : null}
      </header>

      <section className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex items-center gap-4 rounded-xl border border-[var(--zeva-border)] bg-[var(--zeva-surface)] px-4 py-3.5">
          <span className="grid size-10 place-items-center rounded-lg border border-[#354c3d] bg-[#1d2921] text-[var(--zeva-accent-strong)]"><ClipboardList className="size-5" aria-hidden="true" /></span>
          <div><p className="text-2xl font-semibold leading-none text-[#edf1ee]">{total}</p><p className="mt-1 text-xs text-[var(--zeva-text-muted)]">{showTrash ? 'Çöp kutusundaki iş emri' : 'Filtrelenen aktif iş emri'}</p></div>
        </div>
        <button type="button" onClick={() => { setShowTrash((current) => !current); setPage(1); }} className="flex min-h-16 items-center justify-center gap-2 rounded-xl border border-[var(--zeva-border-strong)] bg-[var(--zeva-surface)] px-5 text-sm font-medium text-[#cbd2cc] hover:bg-[var(--zeva-surface-hover)]">
          {showTrash ? <ClipboardList className="size-4" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
          {showTrash ? 'Aktif iş emirleri' : 'Çöp kutusu'}
        </button>
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--zeva-border)] bg-[var(--zeva-surface)]">
        <div className="space-y-3 border-b border-[var(--zeva-border)] px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#778078]" aria-hidden="true" />
              <label htmlFor="work-order-search" className="sr-only">İş emri ara</label>
              <input id="work-order-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ürün veya müşteri ara" className="h-10 w-full rounded-lg border border-[var(--zeva-border-strong)] bg-[#111512] pl-10 pr-3 text-sm text-[var(--zeva-text)] focus:border-[var(--zeva-accent)] focus:outline-none" />
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:w-[620px]">
              <select aria-label="Müşteri filtresi" value={customerId} onChange={(event) => { setCustomerId(event.target.value); setPage(1); }} onFocus={() => setCustomerFilterSearch('')} className="h-10 rounded-lg border border-[var(--zeva-border-strong)] bg-[#111512] px-3 text-sm text-[#cbd2cc]">
                <option value="">Tüm müşteriler</option>
                {customerFilterQuery.data?.items.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
              <select aria-label="Hizmet türü filtresi" value={type} onChange={(event) => { setType(event.target.value as WorkOrderType | ''); setPage(1); }} className="h-10 rounded-lg border border-[var(--zeva-border-strong)] bg-[#111512] px-3 text-sm text-[#cbd2cc]">
                <option value="">Tüm hizmetler</option>
                {workOrderTypes.map((item) => <option key={item} value={item}>{workOrderTypeLabels[item]}</option>)}
              </select>
              <select aria-label="Durum filtresi" value={status} onChange={(event) => { setStatus(event.target.value as WorkOrderStatus | ''); setPage(1); }} className="h-10 rounded-lg border border-[var(--zeva-border-strong)] bg-[#111512] px-3 text-sm text-[#cbd2cc]">
                <option value="">Tüm durumlar</option>
                {workOrderStatuses.map((item) => <option key={item} value={item}>{workOrderStatusLabels[item]}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="customer-filter-search" className="text-xs text-[var(--zeva-text-muted)]">Müşteri seçeneklerinde ara</label>
              <input id="customer-filter-search" value={customerFilterSearch} onChange={(event) => setCustomerFilterSearch(event.target.value)} className="h-8 w-44 rounded-md border border-[var(--zeva-border)] bg-[#111512] px-2 text-xs" />
            </div>
            <div className="flex items-center gap-3">
              {listQuery.isFetching && !listQuery.isPending ? <span className="flex items-center gap-2 text-xs text-[var(--zeva-text-muted)]"><RefreshCw className="size-3.5 animate-spin" aria-hidden="true" /> Güncelleniyor</span> : null}
              {hasFilters ? <button type="button" onClick={resetFilters} className="flex items-center gap-1.5 text-xs font-medium text-[#aeb6b0] hover:text-white"><FilterX className="size-3.5" aria-hidden="true" /> Filtreleri temizle</button> : null}
            </div>
          </div>
        </div>

        {listQuery.isPending || isPageOutOfRange ? (
          <WorkOrderTableSkeleton />
        ) : listQuery.isError ? (
          <div className="p-5"><EmptyState title="İş emirleri yüklenemedi" description="API bağlantısını kontrol edip tekrar deneyin." icon={RefreshCw} action={<button type="button" onClick={() => void listQuery.refetch()} className="rounded-lg bg-[var(--zeva-accent)] px-4 py-2 text-sm font-semibold text-[#0d140f]">Tekrar dene</button>} /></div>
        ) : !data?.items.length ? (
          <div className="p-5"><EmptyState title={hasFilters ? 'Filtrelere uygun iş emri yok' : showTrash ? 'Çöp kutusu boş' : 'Henüz iş emri yok'} description={hasFilters ? 'Filtreleri temizleyerek tekrar deneyin.' : showTrash ? 'Silinen iş emirleri burada görüntülenir.' : 'İlk iş emrini oluşturarak başlayın.'} icon={ClipboardList} action={!showTrash && !hasFilters ? <button type="button" onClick={() => setFormWorkOrder(null)} className="rounded-lg bg-[var(--zeva-accent)] px-4 py-2 text-sm font-semibold text-[#0d140f]">Yeni iş emri</button> : undefined} /></div>
        ) : (
          <WorkOrderTable items={data.items} deleted={showTrash} disabled={isMutating} onDetail={setDetailId} onEdit={setFormWorkOrder} onStatus={(item, nextStatus) => void changeStatus(item, nextStatus)} onDelete={(item) => void deleteWorkOrder(item)} onRestore={(item) => void restoreWorkOrder(item)} />
        )}

        {data && data.pagination.totalPages > 1 ? (
          <footer className="flex items-center justify-between border-t border-[var(--zeva-border)] px-4 py-3">
            <p className="text-xs text-[var(--zeva-text-muted)]">Sayfa {data.pagination.page} / {data.pagination.totalPages}</p>
            <div className="flex gap-2">
              <button type="button" aria-label="Önceki sayfa" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="grid size-9 place-items-center rounded-lg border border-[var(--zeva-border-strong)] text-[#cbd2cc] disabled:opacity-40"><ChevronLeft className="size-4" aria-hidden="true" /></button>
              <button type="button" aria-label="Sonraki sayfa" disabled={page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="grid size-9 place-items-center rounded-lg border border-[var(--zeva-border-strong)] text-[#cbd2cc] disabled:opacity-40"><ChevronRight className="size-4" aria-hidden="true" /></button>
            </div>
          </footer>
        ) : null}
      </section>

      {formWorkOrder !== undefined ? <WorkOrderFormDialog workOrder={formWorkOrder} isPending={createMutation.isPending || updateMutation.isPending} onClose={() => setFormWorkOrder(undefined)} onSubmit={submitWorkOrder} /> : null}
      {detailId ? <WorkOrderDetailDialog workOrderId={detailId} onClose={() => setDetailId(null)} onEdit={(item) => { setDetailId(null); setFormWorkOrder(item); }} /> : null}
    </div>
  );
}

interface WorkOrderTableProps {
  items: WorkOrder[];
  deleted: boolean;
  disabled: boolean;
  onDetail: (id: string) => void;
  onEdit: (workOrder: WorkOrder) => void;
  onStatus: (workOrder: WorkOrder, status: WorkOrderStatus) => void;
  onDelete: (workOrder: WorkOrder) => void;
  onRestore: (workOrder: WorkOrder) => void;
}

function WorkOrderTable({ items, deleted, disabled, onDetail, onEdit, onStatus, onDelete, onRestore }: WorkOrderTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] text-left">
        <thead className="bg-[#111512] text-[11px] font-semibold uppercase tracking-[0.1em] text-[#778078]"><tr><th className="px-4 py-3">İş / ürün</th><th className="px-4 py-3">Müşteri</th><th className="px-4 py-3">Hizmet</th><th className="px-4 py-3 text-right">Adet</th><th className="px-4 py-3 text-right">Birim</th><th className="px-4 py-3 text-right">Toplam</th><th className="px-4 py-3">Durum</th><th className="px-4 py-3">Termin</th><th className="px-4 py-3 text-right">İşlemler</th></tr></thead>
        <tbody className="divide-y divide-[var(--zeva-border)]">
          {items.map((item) => (
            <tr key={item.id} className="transition-colors duration-150 hover:bg-[var(--zeva-surface-hover)]">
              <td className="px-4 py-3.5"><p className="font-medium text-[#e1e7e2]">{item.productName}</p><p className="mt-0.5 text-xs text-[#747d75]">Alınma: {formatDate(item.receivedAt)}</p></td>
              <td className="px-4 py-3.5 text-sm text-[#c5ccc6]">{item.customer.name}</td>
              <td className="px-4 py-3.5 text-sm text-[#9da69f]">{workOrderTypeLabels[item.type]}</td>
              <td className="px-4 py-3.5 text-right text-sm tabular-nums text-[#cbd2cc]">{item.totalQuantity.toLocaleString('tr-TR')}</td>
              <td className="px-4 py-3.5 text-right text-sm tabular-nums text-[#aeb6b0]">{item.unitPrice} TL</td>
              <td className="px-4 py-3.5 text-right text-sm font-semibold tabular-nums text-[#dce3dd]">{item.totalAmount} TL</td>
              <td className="px-4 py-3.5">{deleted ? <WorkOrderStatusBadge status={item.status} /> : <select aria-label={`Durum: ${item.productName}`} value={item.status} disabled={disabled} onChange={(event) => onStatus(item, event.target.value as WorkOrderStatus)} className="h-8 rounded-lg border border-[var(--zeva-border-strong)] bg-[#111512] px-2 text-xs text-[#cbd2cc]">{workOrderStatuses.map((status) => <option key={status} value={status}>{workOrderStatusLabels[status]}</option>)}</select>}</td>
              <td className="px-4 py-3.5 text-sm text-[#9da69f]">{formatDate(item.dueAt)}</td>
              <td className="px-4 py-3.5"><div className="flex justify-end gap-1.5">
                {deleted ? <button type="button" disabled={disabled} onClick={() => onRestore(item)} aria-label={`Geri yükle: ${item.productName}`} className="flex h-8 items-center gap-1.5 rounded-lg border border-[#354c3d] px-2.5 text-xs text-[var(--zeva-accent-strong)] disabled:opacity-50"><ArchiveRestore className="size-3.5" aria-hidden="true" /> Geri yükle</button> : <>
                  <button type="button" onClick={() => onDetail(item.id)} aria-label={`Detayı görüntüle: ${item.productName}`} className="grid size-8 place-items-center rounded-lg text-[#9ba49c] hover:bg-[#222923]"><Eye className="size-4" aria-hidden="true" /></button>
                  <button type="button" onClick={() => onEdit(item)} aria-label={`Düzenle: ${item.productName}`} className="grid size-8 place-items-center rounded-lg text-[#9ba49c] hover:bg-[#222923]"><Pencil className="size-4" aria-hidden="true" /></button>
                  <button type="button" disabled={disabled} onClick={() => onDelete(item)} aria-label={`Sil: ${item.productName}`} className="grid size-8 place-items-center rounded-lg text-[#b78686] hover:bg-[#2a1d1d] disabled:opacity-50"><Trash2 className="size-4" aria-hidden="true" /></button>
                </>}
              </div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkOrderTableSkeleton() {
  return <div className="space-y-3 p-4" aria-label="İş emirleri yükleniyor">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div>;
}
