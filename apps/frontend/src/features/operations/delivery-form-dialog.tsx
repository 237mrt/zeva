import { LoaderCircle, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Combobox } from '../../components/ui/combobox';
import { useCustomerList } from '../customers/customer.queries';
import { useDeliverablePackages } from './operation.queries';
import type { CreateDeliveryInput } from './operation.types';
import { packageTypeLabels } from './operation.types';

function localDateTime() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

interface DeliveryFormDialogProps {
  initialCustomer?: { id: string; name: string } | undefined;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: CreateDeliveryInput) => Promise<void>;
}

export function DeliveryFormDialog({ initialCustomer, pending, onClose, onSubmit }: DeliveryFormDialogProps) {
  const [customerId, setCustomerId] = useState(initialCustomer?.id ?? '');
  const [customerName, setCustomerName] = useState(initialCustomer?.name);
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [deliveredAt, setDeliveredAt] = useState(localDateTime);
  const [receiverName, setReceiverName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(customerSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [customerSearch]);

  const customers = useCustomerList({ q: debouncedSearch, page: 1, pageSize: 20, deleted: false });
  const deliverable = useDeliverablePackages(customerId || null);
  const groups = useMemo(() => deliverable.data?.workOrders ?? [], [deliverable.data?.workOrders]);
  const packages = useMemo(() => groups.flatMap((group) => group.packages), [groups]);
  const selectedPackages = useMemo(
    () => packages.filter((item) => selected.includes(item.id)),
    [packages, selected],
  );
  const selectedWorkOrderCount = new Set(selectedPackages.map((item) => item.workOrderId)).size;
  const selectedQuantity = selectedPackages.reduce((sum, item) => sum + item.quantity, 0);
  const allSelected = packages.length > 0 && selected.length === packages.length;

  const toggleMany = (ids: string[]) => {
    setSelected((current) => {
      const everySelected = ids.every((id) => current.includes(id));
      return everySelected
        ? current.filter((id) => !ids.includes(id))
        : [...new Set([...current, ...ids])];
    });
  };

  const submit = () => onSubmit({
    customerId,
    packageIds: selected,
    deliveredAt: new Date(deliveredAt).toISOString(),
    receiverName: receiverName.trim() || null,
    notes: notes.trim() || null,
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-0 sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-form-title"
        tabIndex={-1}
        autoFocus
        onKeyDown={(event) => event.key === 'Escape' && !pending && onClose()}
        className="h-full w-full overflow-y-auto border-[var(--zeva-border-strong)] bg-[var(--zeva-surface)] p-5 shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-xl sm:border sm:p-6"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--zeva-accent)]">Teslimat</p>
            <h2 id="delivery-form-title" className="mt-1 text-xl font-semibold text-white">Yeni teslimat</h2>
            <p className="mt-1 text-sm text-[var(--zeva-text-muted)]">Müşterinin farklı iş emirlerindeki paketlerini birlikte teslim edin.</p>
          </div>
          <button type="button" aria-label="Teslimat penceresini kapat" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-lg text-[#929b94]"><X className="size-5" /></button>
        </header>

        <div className="mt-5">
          <label htmlFor="delivery-customer" className="text-sm font-medium text-[#dce2dd]">Müşteri</label>
          <Combobox
            value={customerId}
            selectedLabel={customerName}
            options={customers.data?.items.map((item) => ({ value: item.id, label: item.name })) ?? []}
            onChange={(id) => {
              setCustomerId(id);
              setCustomerName(customers.data?.items.find((item) => item.id === id)?.name);
              setSelected([]);
            }}
            onSearchChange={setCustomerSearch}
            ariaLabel="Teslimat müşterisi"
            inputId="delivery-customer"
            placeholder="Müşteri ara…"
            loading={customers.isFetching}
            loadingText="Müşteriler aranıyor…"
            emptyText="Bu aramayla eşleşen müşteri bulunamadı."
            className="mt-2"
          />
        </div>

        {!customerId ? (
          <p className="mt-5 rounded-lg border border-dashed border-[var(--zeva-border)] p-4 text-sm text-[var(--zeva-text-muted)]">Teslim edilecek paketleri görmek için müşteri seçin.</p>
        ) : deliverable.isPending ? (
          <p className="mt-5 rounded-lg border border-[var(--zeva-border)] p-4 text-sm text-[var(--zeva-text-muted)]">Teslim edilebilir paketler yükleniyor…</p>
        ) : deliverable.isError ? (
          <p role="alert" className="mt-5 rounded-lg border border-[#5f3d3d] bg-[#261a1a] p-4 text-sm text-[#e4a0a0]">Paketler yüklenemedi. Lütfen tekrar deneyin.</p>
        ) : packages.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-[var(--zeva-border)] p-4 text-sm text-[var(--zeva-text-muted)]">Bu müşterinin teslim edilebilecek paketi bulunmuyor.</p>
        ) : (
          <fieldset className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <legend className="text-sm font-medium text-[#dce2dd]">Teslim edilecek paketler</legend>
              <button type="button" onClick={() => toggleMany(packages.map((item) => item.id))} className="min-h-9 rounded-lg px-3 text-xs font-semibold text-[var(--zeva-accent-strong)] hover:bg-[#202a22]">{allSelected ? 'Tüm seçimi kaldır' : 'Tüm paketleri seç'}</button>
            </div>
            <div className="mt-2 space-y-3">
              {groups.map((group) => {
                const ids = group.packages.map((item) => item.id);
                const groupSelected = ids.every((id) => selected.includes(id));
                return (
                  <section key={group.workOrder.id} className="rounded-xl border border-[var(--zeva-border)] bg-[#111512] p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-white">{group.workOrder.productName}</h3>
                        <p className="mt-1 text-xs text-[var(--zeva-text-muted)]">İş Emri {group.workOrder.id}</p>
                      </div>
                      <button type="button" onClick={() => toggleMany(ids)} className="min-h-9 shrink-0 rounded-lg px-3 text-xs font-semibold text-[var(--zeva-accent-strong)] hover:bg-[#202a22]">{groupSelected ? 'Seçimi kaldır' : 'Tümünü seç'}</button>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {group.packages.map((item) => (
                        <label key={item.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border p-3 ${selected.includes(item.id) ? 'border-[var(--zeva-accent)] bg-[#1c2920]' : 'border-[var(--zeva-border)] bg-[#171b18]'}`}>
                          <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleMany([item.id])} className="size-4 accent-[var(--zeva-accent)]" />
                          <span className="min-w-0 flex-1 text-sm text-[#dce2dd]">{packageTypeLabels[item.type]} #{item.sequenceNo}</span>
                          <strong className="text-sm text-white">{item.quantity.toLocaleString('tr-TR')} adet</strong>
                        </label>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-[#36503d] bg-[#19231c] px-4 py-3 text-center text-sm text-[#cfdfd3]">
          <span><strong className="block text-white">{selectedWorkOrderCount}</strong> iş emri</span>
          <span><strong className="block text-white">{selected.length}</strong> paket</span>
          <span><strong className="block text-white">{selectedQuantity.toLocaleString('tr-TR')}</strong> adet</span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="delivery-date" className="text-sm text-[#d8ded9]">Teslim tarihi</label><input id="delivery-date" type="datetime-local" value={deliveredAt} onChange={(event) => setDeliveredAt(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--zeva-border-strong)] bg-[#111512] px-3 text-white" /></div>
          <div><label htmlFor="receiver-name" className="text-sm text-[#d8ded9]">Teslim alan kişi</label><input id="receiver-name" value={receiverName} onChange={(event) => setReceiverName(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--zeva-border-strong)] bg-[#111512] px-3 text-white" /></div>
        </div>
        <div className="mt-4"><label htmlFor="delivery-notes" className="text-sm text-[#d8ded9]">Notlar</label><textarea id="delivery-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--zeva-border-strong)] bg-[#111512] p-3 text-sm text-white" /></div>
        <footer className="mt-6 flex justify-end gap-2 border-t border-[var(--zeva-border)] pt-5">
          <button type="button" onClick={onClose} className="min-h-10 rounded-lg border border-[var(--zeva-border-strong)] px-4 text-sm text-[#cbd2cc]">Vazgeç</button>
          <button type="button" disabled={pending || !customerId || selected.length === 0 || !deliveredAt} onClick={() => void submit()} className="flex min-h-10 items-center gap-2 rounded-lg bg-[var(--zeva-accent)] px-4 text-sm font-semibold text-[#0d140f] disabled:opacity-50">{pending ? <LoaderCircle className="size-4 animate-spin" /> : null} Teslimatı oluştur</button>
        </footer>
      </section>
    </div>
  );
}
