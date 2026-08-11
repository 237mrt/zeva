import {
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRoundX,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '../../components/feedback/empty-state';
import { Skeleton } from '../../components/feedback/skeleton';
import { useConfirmation } from '../../hooks/use-confirmation';
import { useToast } from '../../hooks/use-toast';
import { CustomerDetailDialog } from './customer-detail-dialog';
import { CustomerFormDialog } from './customer-form-dialog';
import {
  useCreateCustomer,
  useCustomerList,
  useDeleteCustomer,
  useRestoreCustomer,
  useUpdateCustomer,
} from './customer.queries';
import type { Customer, CustomerListParams, CustomerMutationInput } from './customer.types';

const pageSize = 20;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value));
}

export function CustomerPage() {
  const toast = useToast();
  const { confirm } = useConfirmation();
  const [showTrash, setShowTrash] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formCustomer, setFormCustomer] = useState<Customer | null | undefined>(undefined);
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const listParams = useMemo<CustomerListParams>(
    () => ({ q: debouncedSearch, page, pageSize, deleted: showTrash }),
    [debouncedSearch, page, showTrash],
  );
  const listQuery = useCustomerList(listParams);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();
  const restoreMutation = useRestoreCustomer();

  const submitCustomer = async (input: CustomerMutationInput) => {
    try {
      if (formCustomer) {
        await updateMutation.mutateAsync({ id: formCustomer.id, input });
        toast.success('Müşteri güncellendi', `${input.name} bilgileri kaydedildi.`);
      } else {
        await createMutation.mutateAsync(input);
        toast.success('Müşteri oluşturuldu', `${input.name} müşteri listesine eklendi.`);
      }
      setFormCustomer(undefined);
    } catch {
      // Global mutation feedback keeps the dialog open so the user can retry.
    }
  };

  const deleteCustomer = async (customer: Customer) => {
    const approved = await confirm({
      title: 'Müşteri silinsin mi?',
      description: `${customer.name} çöp kutusuna taşınacak ve normal iş akışlarında görünmeyecek.`,
      confirmLabel: 'Müşteriyi sil',
      cancelLabel: 'Vazgeç',
      tone: 'danger',
    });
    if (!approved) return;

    try {
      await deleteMutation.mutateAsync(customer.id);
      if (detailCustomerId === customer.id) setDetailCustomerId(null);
      toast.success('Müşteri silindi', `${customer.name} çöp kutusuna taşındı.`);
    } catch {
      // Global mutation feedback reports the API error.
    }
  };

  const restoreCustomer = async (customer: Customer) => {
    try {
      await restoreMutation.mutateAsync(customer.id);
      toast.success('Müşteri geri yüklendi', `${customer.name} yeniden aktif müşterilere taşındı.`);
    } catch {
      // Global mutation feedback reports the API error.
    }
  };

  const data = listQuery.data;
  const total = data?.pagination.total ?? 0;
  const isMutating = deleteMutation.isPending || restoreMutation.isPending;
  const lastPage = Math.max(1, data?.pagination.totalPages ?? 1);
  const isPageOutOfRange =
    Boolean(data) && !listQuery.isPlaceholderData && page > lastPage;

  useEffect(() => {
    if (!data || listQuery.isPlaceholderData || page <= lastPage) return;
    const timer = window.setTimeout(() => {
      setPage((currentPage) => (currentPage > lastPage ? lastPage : currentPage));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [data, lastPage, listQuery.isPlaceholderData, page]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--zeva-accent)]">
            İlişkiler
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#eef2ef]">Müşteriler</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--zeva-text-muted)]">
            İletişim bilgilerini, kayıt yaşam döngüsünü ve müşteri özel hizmet fiyatlarını yönetin.
          </p>
        </div>
        {!showTrash ? (
          <button
            type="button"
            onClick={() => setFormCustomer(null)}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--zeva-accent)] px-4 text-sm font-semibold text-[#0d140f] hover:bg-[var(--zeva-accent-strong)] active:translate-y-px"
          >
            <Plus className="size-4" aria-hidden="true" /> Yeni müşteri
          </button>
        ) : null}
      </header>

      <section className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex items-center gap-4 rounded-xl border border-[var(--zeva-border)] bg-[var(--zeva-surface)] px-4 py-3.5">
          <span className="grid size-10 place-items-center rounded-lg border border-[#354c3d] bg-[#1d2921] text-[var(--zeva-accent-strong)]">
            {showTrash ? <UserRoundX className="size-5" aria-hidden="true" /> : <Users className="size-5" aria-hidden="true" />}
          </span>
          <div>
            <p className="text-2xl font-semibold leading-none text-[#edf1ee]">{total}</p>
            <p className="mt-1 text-xs text-[var(--zeva-text-muted)]">
              {showTrash ? 'Çöp kutusundaki müşteri' : 'Aktif müşteri'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowTrash((current) => !current);
            setPage(1);
          }}
          className="flex min-h-16 items-center justify-center gap-2 rounded-xl border border-[var(--zeva-border-strong)] bg-[var(--zeva-surface)] px-5 text-sm font-medium text-[#cbd2cc] hover:bg-[var(--zeva-surface-hover)]"
        >
          {showTrash ? <Users className="size-4" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
          {showTrash ? 'Aktif müşteriler' : 'Çöp kutusu'}
        </button>
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--zeva-border)] bg-[var(--zeva-surface)]">
        <div className="flex flex-col gap-3 border-b border-[var(--zeva-border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#778078]" aria-hidden="true" />
            <label htmlFor="customer-search" className="sr-only">Müşteri ara</label>
            <input
              id="customer-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ad, yetkili veya telefon ara"
              className="h-10 w-full rounded-lg border border-[var(--zeva-border-strong)] bg-[#111512] pl-10 pr-3 text-sm text-[var(--zeva-text)] placeholder:text-[#687169] focus:border-[var(--zeva-accent)] focus:outline-none"
            />
          </div>
          {listQuery.isFetching && !listQuery.isPending ? (
            <span className="flex items-center gap-2 text-xs text-[var(--zeva-text-muted)]">
              <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" /> Güncelleniyor
            </span>
          ) : null}
        </div>

        {listQuery.isPending || isPageOutOfRange ? (
          <CustomerTableSkeleton />
        ) : listQuery.isError ? (
          <div className="p-5">
            <EmptyState
              title="Müşteriler yüklenemedi"
              description="API bağlantısını kontrol edip tekrar deneyin."
              icon={RefreshCw}
              action={
                <button type="button" onClick={() => void listQuery.refetch()} className="rounded-lg bg-[var(--zeva-accent)] px-4 py-2 text-sm font-semibold text-[#0d140f]">
                  Tekrar dene
                </button>
              }
            />
          </div>
        ) : !data?.items.length ? (
          <div className="p-5">
            <EmptyState
              title={search ? 'Arama sonucu bulunamadı' : showTrash ? 'Çöp kutusu boş' : 'Henüz müşteri yok'}
              description={search ? 'Arama ifadesini değiştirerek tekrar deneyin.' : showTrash ? 'Silinen müşteriler burada görüntülenir.' : 'İlk müşteri kaydını oluşturarak başlayın.'}
              icon={showTrash ? UserRoundX : Users}
              action={!showTrash && !search ? (
                <button type="button" onClick={() => setFormCustomer(null)} className="rounded-lg bg-[var(--zeva-accent)] px-4 py-2 text-sm font-semibold text-[#0d140f]">Yeni müşteri</button>
              ) : undefined}
            />
          </div>
        ) : (
          <CustomerTable
            items={data.items}
            deleted={showTrash}
            disabled={isMutating}
            onDetail={setDetailCustomerId}
            onEdit={(customer) => setFormCustomer(customer)}
            onDelete={(customer) => void deleteCustomer(customer)}
            onRestore={(customer) => void restoreCustomer(customer)}
          />
        )}

        {data && data.pagination.totalPages > 1 ? (
          <footer className="flex items-center justify-between border-t border-[var(--zeva-border)] px-4 py-3">
            <p className="text-xs text-[var(--zeva-text-muted)]">
              Sayfa {data.pagination.page} / {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button type="button" aria-label="Önceki sayfa" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="grid size-9 place-items-center rounded-lg border border-[var(--zeva-border-strong)] text-[#cbd2cc] hover:bg-[var(--zeva-surface-hover)] disabled:opacity-40"><ChevronLeft className="size-4" aria-hidden="true" /></button>
              <button type="button" aria-label="Sonraki sayfa" disabled={page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="grid size-9 place-items-center rounded-lg border border-[var(--zeva-border-strong)] text-[#cbd2cc] hover:bg-[var(--zeva-surface-hover)] disabled:opacity-40"><ChevronRight className="size-4" aria-hidden="true" /></button>
            </div>
          </footer>
        ) : null}
      </section>

      {formCustomer !== undefined ? (
        <CustomerFormDialog
          customer={formCustomer}
          isPending={createMutation.isPending || updateMutation.isPending}
          onClose={() => setFormCustomer(undefined)}
          onSubmit={submitCustomer}
        />
      ) : null}

      {detailCustomerId ? (
        <CustomerDetailDialog
          customerId={detailCustomerId}
          onClose={() => setDetailCustomerId(null)}
          onEdit={(customer) => {
            setDetailCustomerId(null);
            setFormCustomer(customer);
          }}
        />
      ) : null}
    </div>
  );
}

interface CustomerTableProps {
  items: Customer[];
  deleted: boolean;
  disabled: boolean;
  onDetail: (id: string) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onRestore: (customer: Customer) => void;
}

function CustomerTable({ items, deleted, disabled, onDetail, onEdit, onDelete, onRestore }: CustomerTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] text-left">
        <thead className="bg-[#111512] text-[11px] font-semibold uppercase tracking-[0.11em] text-[#778078]">
          <tr><th className="px-4 py-3">Müşteri adı</th><th className="px-4 py-3">Yetkili</th><th className="px-4 py-3">Telefon</th><th className="px-4 py-3">Güncellenme</th><th className="px-4 py-3 text-right">İşlemler</th></tr>
        </thead>
        <tbody className="divide-y divide-[var(--zeva-border)]">
          {items.map((customer) => (
            <tr key={customer.id} className="transition-colors duration-150 hover:bg-[var(--zeva-surface-hover)]">
              <td className="px-4 py-3.5"><p className="font-medium text-[#e1e7e2]">{customer.name}</p><p className="mt-0.5 text-xs text-[#747d75]">{deleted ? `Silinme: ${formatDate(customer.deletedAt ?? customer.updatedAt)}` : customer.address || 'Adres bilgisi yok'}</p></td>
              <td className="px-4 py-3.5 text-sm text-[#c5ccc6]">{customer.contactName || '—'}</td>
              <td className="px-4 py-3.5 text-sm text-[#c5ccc6]">{customer.phone || '—'}</td>
              <td className="px-4 py-3.5 text-sm text-[#9da69f]">{formatDate(customer.updatedAt)}</td>
              <td className="px-4 py-3.5"><div className="flex justify-end gap-1.5">
                {deleted ? (
                  <button type="button" disabled={disabled} onClick={() => onRestore(customer)} aria-label={`Geri yükle: ${customer.name}`} className="flex h-8 items-center gap-1.5 rounded-lg border border-[#354c3d] px-2.5 text-xs font-medium text-[var(--zeva-accent-strong)] hover:bg-[#1d2921] disabled:opacity-50"><ArchiveRestore className="size-3.5" aria-hidden="true" /> Geri yükle</button>
                ) : (
                  <>
                    <button type="button" onClick={() => onDetail(customer.id)} aria-label={`Detayı görüntüle: ${customer.name}`} className="grid size-8 place-items-center rounded-lg text-[#9ba49c] hover:bg-[#222923] hover:text-[#dbe1dc]"><Eye className="size-4" aria-hidden="true" /></button>
                    <button type="button" onClick={() => onEdit(customer)} aria-label={`Düzenle: ${customer.name}`} className="grid size-8 place-items-center rounded-lg text-[#9ba49c] hover:bg-[#222923] hover:text-[#dbe1dc]"><Pencil className="size-4" aria-hidden="true" /></button>
                    <button type="button" disabled={disabled} onClick={() => onDelete(customer)} aria-label={`Sil: ${customer.name}`} className="grid size-8 place-items-center rounded-lg text-[#b78686] hover:bg-[#2a1d1d] hover:text-[#e0a0a0] disabled:opacity-50"><Trash2 className="size-4" aria-hidden="true" /></button>
                  </>
                )}
              </div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomerTableSkeleton() {
  return (
    <div className="space-y-3 p-4" aria-label="Müşteriler yükleniyor">
      {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-14 w-full" />)}
    </div>
  );
}
