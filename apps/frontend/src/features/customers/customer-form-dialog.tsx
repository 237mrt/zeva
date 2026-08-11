import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, X } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';

import type { Customer, CustomerMutationInput } from './customer.types';

const customerFormSchema = z.object({
  name: z.string().trim().min(2, 'Müşteri adı en az 2 karakter olmalıdır.').max(191),
  contactName: z.string().trim().max(120),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((value) => value.length === 0 || value.length >= 3, 'Telefon en az 3 karakter olmalıdır.'),
  address: z.string().trim().max(500),
  notes: z.string().trim().max(5_000),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerFormDialogProps {
  customer: Customer | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (input: CustomerMutationInput) => Promise<void>;
}

function defaultValues(customer: Customer | null): CustomerFormData {
  return {
    name: customer?.name ?? '',
    contactName: customer?.contactName ?? '',
    phone: customer?.phone ?? '',
    address: customer?.address ?? '',
    notes: customer?.notes ?? '',
  };
}

function optionalValue(value: string): string | null {
  return value.trim() || null;
}

export function CustomerFormDialog({
  customer,
  isPending,
  onClose,
  onSubmit,
}: CustomerFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: defaultValues(customer),
  });

  useEffect(() => {
    reset(defaultValues(customer));
  }, [customer, reset]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPending, onClose]);

  const submit: SubmitHandler<CustomerFormData> = async (values) => {
    await onSubmit({
      name: values.name.trim(),
      contactName: optionalValue(values.contactName),
      phone: optionalValue(values.phone),
      address: optionalValue(values.address),
      notes: optionalValue(values.notes),
    });
  };
  const disabled = isPending || isSubmitting;
  const fieldClass =
    'mt-1.5 h-10 w-full rounded-lg border border-[var(--zeva-border-strong)] bg-[#111512] px-3 text-sm text-[var(--zeva-text)] placeholder:text-[#687169] hover:border-[#485248] focus:border-[var(--zeva-accent)] focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 px-4 py-6" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-form-title"
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--zeva-border-strong)] bg-[var(--zeva-surface)] shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-[var(--zeva-border)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--zeva-accent)]">
              Müşteri kaydı
            </p>
            <h2 id="customer-form-title" className="mt-1 text-lg font-semibold text-[#edf1ee]">
              {customer ? 'Müşteriyi düzenle' : 'Yeni müşteri'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Formu kapat"
            disabled={disabled}
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg text-[var(--zeva-text-muted)] hover:bg-[var(--zeva-surface-hover)] hover:text-[var(--zeva-text)] disabled:opacity-50"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <form
          className="space-y-5 px-5 py-5 sm:px-6"
          noValidate
          onSubmit={(event) => void handleSubmit(submit)(event)}
        >
          <div>
            <label htmlFor="customer-name" className="text-sm font-medium text-[#d8ded9]">
              Müşteri adı <span className="text-[var(--zeva-danger)]">*</span>
            </label>
            <input
              id="customer-name"
              autoFocus
              aria-invalid={Boolean(errors.name)}
              className={fieldClass}
              {...register('name')}
            />
            {errors.name ? <p className="mt-1.5 text-xs text-[var(--zeva-danger)]">{errors.name.message}</p> : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="customer-contact" className="text-sm font-medium text-[#d8ded9]">Yetkili kişi</label>
              <input id="customer-contact" className={fieldClass} {...register('contactName')} />
              {errors.contactName ? <p className="mt-1.5 text-xs text-[var(--zeva-danger)]">{errors.contactName.message}</p> : null}
            </div>
            <div>
              <label htmlFor="customer-phone" className="text-sm font-medium text-[#d8ded9]">Telefon</label>
              <input id="customer-phone" type="tel" className={fieldClass} {...register('phone')} />
              {errors.phone ? <p className="mt-1.5 text-xs text-[var(--zeva-danger)]">{errors.phone.message}</p> : null}
            </div>
          </div>

          <div>
            <label htmlFor="customer-address" className="text-sm font-medium text-[#d8ded9]">Adres</label>
            <textarea
              id="customer-address"
              rows={3}
              className={`${fieldClass} h-auto min-h-24 py-2.5`}
              {...register('address')}
            />
            {errors.address ? <p className="mt-1.5 text-xs text-[var(--zeva-danger)]">{errors.address.message}</p> : null}
          </div>

          <div>
            <label htmlFor="customer-notes" className="text-sm font-medium text-[#d8ded9]">Notlar</label>
            <textarea
              id="customer-notes"
              rows={4}
              className={`${fieldClass} h-auto min-h-28 py-2.5`}
              {...register('notes')}
            />
            {errors.notes ? <p className="mt-1.5 text-xs text-[var(--zeva-danger)]">{errors.notes.message}</p> : null}
          </div>

          <footer className="flex justify-end gap-3 border-t border-[var(--zeva-border)] pt-5">
            <button
              type="button"
              disabled={disabled}
              onClick={onClose}
              className="h-10 rounded-lg border border-[var(--zeva-border-strong)] px-4 text-sm font-medium text-[#cbd2cc] hover:bg-[var(--zeva-surface-hover)] disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={disabled}
              className="flex h-10 items-center gap-2 rounded-lg bg-[var(--zeva-accent)] px-4 text-sm font-semibold text-[#0d140f] hover:bg-[var(--zeva-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {disabled ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
              {customer ? 'Değişiklikleri kaydet' : 'Müşteri oluştur'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
