import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator, LoaderCircle, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';

import { Combobox } from '../../components/ui/combobox';
import { Select } from '../../components/ui/select';
import { useCustomerList, useCustomerPrices } from '../customers/customer.queries';
import { workOrderTypeLabels, workOrderTypes } from '../customers/customer.types';
import type { WorkOrder, WorkOrderMutationInput } from './work-order.types';

const decimalPattern = /^(?:0|[1-9][0-9]{0,9})(?:[.][0-9]{1,2})?$/;

const workOrderFormSchema = z
  .object({
    customerId: z.string().min(1, 'Müşteri seçmelisiniz.'),
    productName: z.string().trim().min(2, 'İş / ürün adı en az 2 karakter olmalıdır.').max(191),
    type: z.enum(workOrderTypes),
    totalQuantity: z.number().int('Adet tam sayı olmalıdır.').min(1, 'Adet en az 1 olmalıdır.').max(1_000_000),
    unitPrice: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || decimalPattern.test(value),
        'En fazla 10 tam ve 2 ondalık basamaklı negatif olmayan bir fiyat girin.',
      ),
    receivedAt: z.string().min(1, 'Alınma tarihi zorunludur.'),
    dueAt: z.string(),
    notes: z.string().trim().max(5_000),
  })
  .superRefine((values, context) => {
    if (values.dueAt && new Date(values.dueAt) < new Date(values.receivedAt)) {
      context.addIssue({
        code: 'custom',
        message: 'Termin tarihi alınma tarihinden önce olamaz.',
        path: ['dueAt'],
      });
    }
  });

type WorkOrderFormData = z.infer<typeof workOrderFormSchema>;

interface WorkOrderFormDialogProps {
  workOrder: WorkOrder | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (input: WorkOrderMutationInput) => Promise<void>;
}

function toDateTimeLocal(value: string | Date): string {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function defaultValues(workOrder: WorkOrder | null): WorkOrderFormData {
  return {
    customerId: workOrder?.customerId ?? '',
    productName: workOrder?.productName ?? '',
    type: workOrder?.type ?? 'IRONING',
    totalQuantity: workOrder?.totalQuantity ?? 1,
    unitPrice: workOrder?.unitPrice ?? '',
    receivedAt: toDateTimeLocal(workOrder?.receivedAt ?? new Date()),
    dueAt: workOrder?.dueAt ? toDateTimeLocal(workOrder.dueAt) : '',
    notes: workOrder?.notes ?? '',
  };
}

function optionalValue(value: string): string | null {
  return value.trim() || null;
}

function calculatePreview(quantity: number, unitPrice: string): string | null {
  if (!Number.isInteger(quantity) || quantity < 1 || !decimalPattern.test(unitPrice.trim())) {
    return null;
  }
  const [whole = '0', fraction = ''] = unitPrice.trim().split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  const totalCents = cents * BigInt(quantity);
  return `${totalCents / 100n}.${String(totalCents % 100n).padStart(2, '0')}`;
}

export function WorkOrderFormDialog({
  workOrder,
  isPending,
  onClose,
  onSubmit,
}: WorkOrderFormDialogProps) {
  const [customerSearch, setCustomerSearch] = useState(workOrder?.customer.name ?? '');
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState(customerSearch);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: defaultValues(workOrder),
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedCustomerSearch(customerSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [customerSearch]);

  const selectedCustomerId = useWatch({ control, name: 'customerId' });
  const selectedType = useWatch({ control, name: 'type' });
  const totalQuantity = useWatch({ control, name: 'totalQuantity' });
  const unitPrice = useWatch({ control, name: 'unitPrice' });
  const previousPricingTarget = useRef({
    customerId: workOrder?.customerId ?? '',
    type: workOrder?.type ?? 'IRONING',
  });

  useEffect(() => {
    const previousTarget = previousPricingTarget.current;
    previousPricingTarget.current = { customerId: selectedCustomerId, type: selectedType };

    if (
      !workOrder ||
      (previousTarget.customerId === selectedCustomerId && previousTarget.type === selectedType)
    ) {
      return;
    }

    setValue('unitPrice', '', { shouldDirty: true, shouldValidate: true });
  }, [selectedCustomerId, selectedType, setValue, workOrder]);

  const customersQuery = useCustomerList({
    q: debouncedCustomerSearch,
    page: 1,
    pageSize: 20,
    deleted: false,
  });
  const pricesQuery = useCustomerPrices(selectedCustomerId || null);
  const customerOptions = useMemo(() => {
    return customersQuery.data?.items ?? [];
  }, [customersQuery.data?.items]);
  const selectedCustomerLabel = customerOptions.find(
    (customer) => customer.id === selectedCustomerId,
  )?.name ?? (selectedCustomerId === workOrder?.customerId ? workOrder.customer.name : undefined);
  const defaultPrice = pricesQuery.data?.find((price) => price.type === selectedType)?.unitPrice;
  const preview = calculatePreview(totalQuantity, unitPrice);
  const disabled = isPending || isSubmitting;
  const fieldClass =
    'mt-1.5 h-10 w-full rounded-lg border border-[var(--zeva-border-strong)] bg-[#111512] px-3 text-sm text-[var(--zeva-text)] placeholder:text-[#687169] hover:border-[#485248] focus:border-[var(--zeva-accent)] focus:outline-none';

  const submit: SubmitHandler<WorkOrderFormData> = async (values) => {
    await onSubmit({
      customerId: values.customerId,
      productName: values.productName.trim(),
      type: values.type,
      totalQuantity: values.totalQuantity,
      ...(values.unitPrice.trim() ? { unitPrice: values.unitPrice.trim() } : {}),
      receivedAt: new Date(values.receivedAt).toISOString(),
      dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : null,
      notes: optionalValue(values.notes),
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 px-4 py-6" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-order-form-title"
        tabIndex={-1}
        autoFocus
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !disabled) onClose();
        }}
        className="max-h-full w-full max-w-3xl overflow-y-auto rounded-xl border border-[var(--zeva-border-strong)] bg-[var(--zeva-surface)] shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-[var(--zeva-border)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--zeva-accent)]">İş emri kaydı</p>
            <h2 id="work-order-form-title" className="mt-1 text-lg font-semibold text-[#edf1ee]">
              {workOrder ? 'İş emrini düzenle' : 'Yeni iş emri'}
            </h2>
          </div>
          <button type="button" aria-label="Formu kapat" disabled={disabled} onClick={onClose} className="grid size-9 place-items-center rounded-lg text-[var(--zeva-text-muted)] hover:bg-[var(--zeva-surface-hover)] disabled:opacity-50">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <form className="space-y-5 px-5 py-5 sm:px-6" noValidate onSubmit={(event) => void handleSubmit(submit)(event)}>
          <div>
            <label htmlFor="work-order-customer" className="text-sm font-medium text-[#d8ded9]">Müşteri <span className="text-[var(--zeva-danger)]">*</span></label>
            <input type="hidden" {...register('customerId')} />
            <Combobox
              value={selectedCustomerId}
              selectedLabel={selectedCustomerLabel}
              options={customerOptions.map((customer) => ({ value: customer.id, label: customer.name }))}
              onChange={(customerId) => setValue('customerId', customerId, { shouldDirty: true, shouldValidate: true })}
              onSearchChange={setCustomerSearch}
              ariaLabel="Müşteri"
              inputId="work-order-customer"
              placeholder="Müşteri seçin veya arayın…"
              loading={customersQuery.isFetching}
              loadingText="Müşteriler aranıyor…"
              emptyText="Bu aramayla eşleşen müşteri bulunamadı."
              invalid={Boolean(errors.customerId)}
              className="mt-1.5"
            />
            {errors.customerId ? <p className="mt-1 text-xs text-[var(--zeva-danger)]">{errors.customerId.message}</p> : null}
          </div>

          <div>
            <label htmlFor="work-order-product" className="text-sm font-medium text-[#d8ded9]">İş / ürün adı <span className="text-[var(--zeva-danger)]">*</span></label>
            <input id="work-order-product" autoFocus aria-invalid={Boolean(errors.productName)} className={fieldClass} {...register('productName')} />
            {errors.productName ? <p className="mt-1 text-xs text-[var(--zeva-danger)]">{errors.productName.message}</p> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="work-order-type" className="text-sm font-medium text-[#d8ded9]">Hizmet türü</label>
              <input type="hidden" {...register('type')} />
              <Select
                value={selectedType}
                options={workOrderTypes.map((type) => ({ value: type, label: workOrderTypeLabels[type] }))}
                onChange={(type) => setValue('type', type, { shouldDirty: true, shouldValidate: true })}
                ariaLabel="Hizmet türü"
                triggerId="work-order-type"
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="work-order-quantity" className="text-sm font-medium text-[#d8ded9]">Toplam adet</label>
              <input id="work-order-quantity" type="number" min={1} max={1_000_000} aria-invalid={Boolean(errors.totalQuantity)} className={fieldClass} {...register('totalQuantity', { valueAsNumber: true })} />
              {errors.totalQuantity ? <p className="mt-1 text-xs text-[var(--zeva-danger)]">{errors.totalQuantity.message}</p> : null}
            </div>
            <div>
              <label htmlFor="work-order-price" className="text-sm font-medium text-[#d8ded9]">Birim fiyat</label>
              <div className="relative">
                <input id="work-order-price" inputMode="decimal" placeholder="Müşteri varsayılanı" aria-invalid={Boolean(errors.unitPrice)} className={`${fieldClass} pr-10`} {...register('unitPrice')} />
                <span className="pointer-events-none absolute bottom-2.5 right-3 text-xs text-[#707970]">TL</span>
              </div>
              {errors.unitPrice ? <p className="mt-1 text-xs text-[var(--zeva-danger)]">{errors.unitPrice.message}</p> : null}
            </div>
          </div>

          {selectedCustomerId ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--zeva-border)] bg-[#111512] px-3 py-2.5 text-xs">
              <span className="text-[var(--zeva-text-muted)]">
                {pricesQuery.isPending ? 'Varsayılan fiyat aranıyor…' : defaultPrice ? `Müşteri varsayılanı: ${defaultPrice} TL` : 'Bu hizmet için müşteri varsayılanı yok.'}
              </span>
              {defaultPrice ? <button type="button" onClick={() => setValue('unitPrice', defaultPrice, { shouldValidate: true })} className="font-semibold text-[var(--zeva-accent-strong)] hover:text-white">Varsayılanı kullan</button> : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="work-order-received" className="text-sm font-medium text-[#d8ded9]">Alınma tarihi</label>
              <input id="work-order-received" type="datetime-local" aria-invalid={Boolean(errors.receivedAt)} className={fieldClass} {...register('receivedAt')} />
              {errors.receivedAt ? <p className="mt-1 text-xs text-[var(--zeva-danger)]">{errors.receivedAt.message}</p> : null}
            </div>
            <div>
              <label htmlFor="work-order-due" className="text-sm font-medium text-[#d8ded9]">Termin tarihi</label>
              <input id="work-order-due" type="datetime-local" aria-invalid={Boolean(errors.dueAt)} className={fieldClass} {...register('dueAt')} />
              {errors.dueAt ? <p className="mt-1 text-xs text-[var(--zeva-danger)]">{errors.dueAt.message}</p> : null}
            </div>
          </div>

          <div>
            <label htmlFor="work-order-notes" className="text-sm font-medium text-[#d8ded9]">Notlar</label>
            <textarea id="work-order-notes" rows={3} className={`${fieldClass} h-auto min-h-24 py-2.5`} {...register('notes')} />
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-[#34483a] bg-[#19231c] px-3 py-2.5 text-sm text-[#cfe0d3]">
            <Calculator className="size-4" aria-hidden="true" />
            Tahmini toplam: <strong>{preview ? `${preview} TL` : '—'}</strong>
            <span className="text-xs text-[#809087]">Kesin tutar kaydettiğinizde hesaplanır.</span>
          </div>

          <footer className="flex justify-end gap-3 border-t border-[var(--zeva-border)] pt-5">
            <button type="button" disabled={disabled} onClick={onClose} className="h-10 rounded-lg border border-[var(--zeva-border-strong)] px-4 text-sm font-medium text-[#cbd2cc] hover:bg-[var(--zeva-surface-hover)] disabled:opacity-50">Vazgeç</button>
            <button type="submit" disabled={disabled} className="flex h-10 items-center gap-2 rounded-lg bg-[var(--zeva-accent)] px-4 text-sm font-semibold text-[#0d140f] hover:bg-[var(--zeva-accent-strong)] disabled:opacity-60">
              {disabled ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
              {workOrder ? 'Değişiklikleri kaydet' : 'İş emri oluştur'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
