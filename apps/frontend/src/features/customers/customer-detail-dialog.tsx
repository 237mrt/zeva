import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, Pencil, Save, X } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';

import { Skeleton } from '../../components/feedback/skeleton';
import { useToast } from '../../hooks/use-toast';
import {
  useCustomerDetail,
  useCustomerPrices,
  useReplaceCustomerPrices,
} from './customer.queries';
import type { Customer, CustomerPrice } from './customer.types';
import { workOrderTypeLabels, workOrderTypes } from './customer.types';

const optionalDecimal = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || /^(?:0|[1-9][0-9]{0,9})(?:[.][0-9]{1,2})?$/.test(value),
    'En fazla 10 tam ve 2 ondalık basamaklı pozitif bir değer girin.',
  );

const priceFormSchema = z.object({
  IRONING: optionalDecimal,
  PACKAGING: optionalDecimal,
  IRONING_PACKAGING: optionalDecimal,
  PRINTING: optionalDecimal,
  OTHER: optionalDecimal,
});

type PriceFormData = z.infer<typeof priceFormSchema>;

interface CustomerDetailDialogProps {
  customerId: string;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
}

function emptyPrices(): PriceFormData {
  return { IRONING: '', PACKAGING: '', IRONING_PACKAGING: '', PRINTING: '', OTHER: '' };
}

function formPrices(prices: CustomerPrice[]): PriceFormData {
  const values = emptyPrices();
  prices.forEach((price) => {
    values[price.type] = price.unitPrice;
  });
  return values;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function CustomerDetailDialog({ customerId, onClose, onEdit }: CustomerDetailDialogProps) {
  const toast = useToast();
  const customerQuery = useCustomerDetail(customerId);
  const pricesQuery = useCustomerPrices(customerId);
  const priceMutation = useReplaceCustomerPrices();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PriceFormData>({ resolver: zodResolver(priceFormSchema), defaultValues: emptyPrices() });

  useEffect(() => {
    if (pricesQuery.data) reset(formPrices(pricesQuery.data));
  }, [pricesQuery.data, reset]);

  const submitPrices: SubmitHandler<PriceFormData> = async (values) => {
    const prices = workOrderTypes.flatMap((type) => {
      const value = values[type].trim();
      return value ? [{ type, unitPrice: value }] : [];
    });
    try {
      await priceMutation.mutateAsync({ id: customerId, prices });
      toast.success('Fiyatlar güncellendi', 'Müşterinin varsayılan hizmet fiyatları kaydedildi.');
    } catch {
      // Global mutation feedback reports the API error and keeps the form open.
    }
  };

  const customer = customerQuery.data;
  const pending = priceMutation.isPending || isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/65" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-detail-title"
        tabIndex={-1}
        autoFocus
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !priceMutation.isPending) onClose();
        }}
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-[var(--zeva-border-strong)] bg-[var(--zeva-surface)] shadow-2xl animate-[panel-in_180ms_ease-out]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--zeva-border)] bg-[var(--zeva-surface)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--zeva-accent)]">
              Müşteri detayı
            </p>
            <h2 id="customer-detail-title" className="mt-1 text-xl font-semibold text-[#edf1ee]">
              {customer?.name ?? 'Müşteri yükleniyor'}
            </h2>
          </div>
          <div className="flex gap-2">
            {customer ? (
              <button
                type="button"
                onClick={() => onEdit(customer)}
                className="flex h-9 items-center gap-2 rounded-lg border border-[var(--zeva-border-strong)] px-3 text-sm text-[#d3d9d4] hover:bg-[var(--zeva-surface-hover)]"
              >
                <Pencil className="size-4" aria-hidden="true" /> Düzenle
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Detayı kapat"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-lg text-[var(--zeva-text-muted)] hover:bg-[var(--zeva-surface-hover)] hover:text-[var(--zeva-text)]"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="space-y-6 px-5 py-5 sm:px-6">
          {customerQuery.isPending ? (
            <div className="space-y-3" aria-label="Müşteri detayı yükleniyor">
              <Skeleton className="h-24" />
              <Skeleton className="h-20" />
            </div>
          ) : customerQuery.isError || !customer ? (
            <div role="alert" className="rounded-xl border border-[#5f3d3d] bg-[#261a1a] p-4 text-sm text-[#e4a0a0]">
              Müşteri detayı yüklenemedi.
            </div>
          ) : (
            <div className="grid gap-4 rounded-xl border border-[var(--zeva-border)] bg-[#111512] p-5 sm:grid-cols-2">
              <Detail label="Yetkili kişi" value={customer.contactName} />
              <Detail label="Telefon" value={customer.phone} />
              <Detail label="Adres" value={customer.address} wide />
              <Detail label="Notlar" value={customer.notes} wide />
              <Detail label="Oluşturulma" value={formatDate(customer.createdAt)} />
              <Detail label="Son güncelleme" value={formatDate(customer.updatedAt)} />
            </div>
          )}

          <section className="rounded-xl border border-[var(--zeva-border)] bg-[#111512] p-5">
            <div>
              <h3 className="text-base font-semibold text-[#e6ebe7]">Hizmet fiyatları</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--zeva-text-muted)]">
                Boş bıraktığınız hizmetlerde varsayılan fiyat kullanılmaz. Tutarları TL olarak girin.
              </p>
            </div>

            {pricesQuery.isPending ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2" aria-label="Fiyatlar yükleniyor">
                {workOrderTypes.map((type) => <Skeleton key={type} className="h-16" />)}
              </div>
            ) : pricesQuery.isError ? (
              <p role="alert" className="mt-5 text-sm text-[var(--zeva-danger)]">Fiyatlar yüklenemedi.</p>
            ) : (
              <form
                className="mt-5"
                noValidate
                onSubmit={(event) => void handleSubmit(submitPrices)(event)}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {workOrderTypes.map((type) => (
                    <div key={type}>
                      <label htmlFor={`price-${type}`} className="text-xs font-medium text-[#cbd2cc]">
                        {workOrderTypeLabels[type]}
                      </label>
                      <div className="relative mt-1.5">
                        <input
                          id={`price-${type}`}
                          inputMode="decimal"
                          aria-invalid={Boolean(errors[type])}
                          className="h-10 w-full rounded-lg border border-[var(--zeva-border-strong)] bg-[var(--zeva-surface)] px-3 pr-10 text-sm text-[var(--zeva-text)] focus:border-[var(--zeva-accent)] focus:outline-none"
                          placeholder="0.00"
                          {...register(type)}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#707970]">TL</span>
                      </div>
                      {errors[type] ? <p className="mt-1 text-xs text-[var(--zeva-danger)]">{errors[type]?.message}</p> : null}
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex justify-end">
                  <button
                    type="submit"
                    disabled={pending}
                    className="flex h-10 items-center gap-2 rounded-lg bg-[var(--zeva-accent)] px-4 text-sm font-semibold text-[#0d140f] hover:bg-[var(--zeva-accent-strong)] disabled:opacity-60"
                  >
                    {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
                    Fiyatları kaydet
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value, wide = false }: { label: string; value: string | null; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#737c75]">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#dbe1dc]">{value || '—'}</dd>
    </div>
  );
}
