import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Select } from '../../components/ui/select';
import { packageTypeLabels, packageTypes, type PackageInput } from './operation.types';

const rowSchema = z.object({ type: z.enum(packageTypes), quantity: z.number().int().min(1).max(1_000_000), notes: z.string().trim().max(2_000) });
const schema = z.object({ packages: z.array(rowSchema).min(1) });
type FormData = z.infer<typeof schema>;

export function PackageBatchForm({ remainingQuantity, pending, onSubmit }: { remainingQuantity: number; pending: boolean; onSubmit: (packages: PackageInput[]) => Promise<void> }) {
  const { register, control, setValue, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { packages: [{ type: 'SACK', quantity: Math.max(1, Math.min(remainingQuantity, 250)), notes: '' }] } });
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'packages' });
  const rows = useWatch({ control, name: 'packages' });
  const preview = rows.reduce((sum, row) => sum + (Number.isInteger(row.quantity) ? row.quantity : 0), 0);
  const disabled = pending || isSubmitting || remainingQuantity <= 0;
  const submit = async (values: FormData) => {
    try {
      await onSubmit(values.packages.map((row) => ({ type: row.type, quantity: row.quantity, ...(row.notes ? { notes: row.notes } : {}) })));
      reset({ packages: [{ type: 'SACK', quantity: Math.max(1, Math.min(remainingQuantity - preview, 250)), notes: '' }] });
    } catch {
      // Global mutation feedback reports the error; rows stay available for retry.
    }
  };
  const parseQuick = (value: string) => {
    const quantities = value.split(/[\s,]+/).filter(Boolean).map(Number).filter((item) => Number.isInteger(item) && item > 0 && item <= 1_000_000);
    if (quantities.length) replace(quantities.slice(0, 100).map((quantity) => ({ type: 'SACK', quantity, notes: '' })));
  };

  return (
    <form className="space-y-4 rounded-xl border border-[var(--zeva-border)] bg-[var(--zeva-surface)] p-4 sm:p-5" noValidate onSubmit={(event) => void handleSubmit(submit)(event)}>
      <div><h2 className="font-semibold text-[#edf1ee]">Hızlı paket girişi</h2><p className="mt-1 text-xs text-[var(--zeva-text-muted)]">Birden fazla çuval veya koliyi tek seferde kaydedin.</p></div>
      <div><label htmlFor="quick-package-entry" className="text-xs font-medium text-[#cbd2cc]">Hızlı adet girişi</label><input id="quick-package-entry" placeholder="250 250 200 50" onBlur={(event) => parseQuick(event.currentTarget.value)} className="mt-1.5 min-h-10 w-full rounded-lg border border-[var(--zeva-border-strong)] bg-[#111512] px-3 text-sm text-white focus:border-[var(--zeva-accent)] focus:outline-none" /></div>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="grid gap-2 rounded-lg border border-[var(--zeva-border)] bg-[#111512] p-3 sm:grid-cols-[150px_130px_1fr_40px] sm:items-start">
            <div><label className="mb-1 block text-xs text-[var(--zeva-text-muted)]" htmlFor={`package-type-${index}`}>Tür</label><input type="hidden" {...register(`packages.${index}.type`)} /><Select value={rows[index]?.type ?? 'SACK'} options={packageTypes.map((type) => ({ value: type, label: packageTypeLabels[type] }))} onChange={(type) => setValue(`packages.${index}.type`, type)} ariaLabel={`${index + 1}. paket türü`} triggerId={`package-type-${index}`} size="small" /></div>
            <div><label className="mb-1 block text-xs text-[var(--zeva-text-muted)]" htmlFor={`package-quantity-${index}`}>Adet</label><input id={`package-quantity-${index}`} type="number" min={1} max={1_000_000} aria-invalid={Boolean(errors.packages?.[index]?.quantity)} {...register(`packages.${index}.quantity`, { valueAsNumber: true })} className="h-9 w-full rounded-lg border border-[var(--zeva-border-strong)] bg-[#171b18] px-3 text-sm text-white focus:border-[var(--zeva-accent)] focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs text-[var(--zeva-text-muted)]" htmlFor={`package-notes-${index}`}>Not</label><input id={`package-notes-${index}`} {...register(`packages.${index}.notes`)} placeholder="İsteğe bağlı" className="h-9 w-full rounded-lg border border-[var(--zeva-border-strong)] bg-[#171b18] px-3 text-sm text-white focus:border-[var(--zeva-accent)] focus:outline-none" /></div>
            <button type="button" aria-label={`${index + 1}. satırı kaldır`} disabled={fields.length === 1} onClick={() => remove(index)} className="mt-5 grid size-9 place-items-center rounded-lg text-[#8e9790] hover:bg-[#2a2222] hover:text-[var(--zeva-danger)] disabled:opacity-30"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 border-t border-[var(--zeva-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => append({ type: 'SACK', quantity: Math.max(1, Math.min(remainingQuantity, 250)), notes: '' })} className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--zeva-border-strong)] px-3 text-sm text-[#d5dbd6]"><Plus className="size-4" /> Satır ekle</button>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center"><span className={`text-sm ${preview > remainingQuantity ? 'text-[var(--zeva-danger)]' : 'text-[var(--zeva-text-muted)]'}`}>Eklenecek: <strong>{preview.toLocaleString('tr-TR')}</strong> · Son kalan: <strong>{Math.max(0, remainingQuantity - preview).toLocaleString('tr-TR')}</strong></span><button type="submit" disabled={disabled || preview > remainingQuantity} className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--zeva-accent)] px-4 text-sm font-semibold text-[#0d140f] disabled:opacity-50">{disabled ? <LoaderCircle className="size-4 animate-spin" /> : null} Paketleri kaydet</button></div>
      </div>
    </form>
  );
}
