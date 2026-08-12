import { z } from 'zod';
import { adjustmentTypes, balanceStatuses, paymentMethods, statementTypes } from './finance.types.js';

const id = z.string().trim().min(1).max(30);
const decimalPattern = /^(?:0|[1-9][0-9]{0,15})(?:[.][0-9]{1,2})?$/;
const canonical = (value: string) => { const [whole='0', fraction=''] = value.split('.'); return `${whole}.${fraction.padEnd(2,'0')}`; };
export const positiveMoneySchema = z.string().trim().regex(decimalPattern, 'Geçerli bir tutar girin.').transform(canonical).refine((value) => value !== '0.00', 'Tutar sıfırdan büyük olmalıdır.');
const optionalText = (max: number) => z.preprocess((value) => typeof value === 'string' && value.trim() === '' ? null : value, z.string().trim().min(1).max(max).nullable().optional());
const optionalQuery = <Schema extends z.ZodTypeAny>(schema: Schema) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
const dateQuery = optionalQuery(z.string().datetime({ offset: true }).transform((value) => new Date(value)));

export const financeIdParamsSchema = z.object({ id });
export const accountCustomerParamsSchema = z.object({ customerId: id });
export const createPaymentSchema = z.object({ customerId: id, amount: positiveMoneySchema, method: z.enum(paymentMethods), paidAt: z.string().datetime({ offset: true }), referenceNo: optionalText(120), notes: optionalText(5_000) });
export const createAdjustmentSchema = z.object({ customerId: id, type: z.enum(adjustmentTypes), amount: positiveMoneySchema, occurredAt: z.string().datetime({ offset: true }), description: z.string().trim().min(3).max(500) });
export const paymentListQuerySchema = z.object({
  q: optionalQuery(z.string().trim().max(191)), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20),
  customerId: optionalQuery(id), method: optionalQuery(z.enum(paymentMethods)), paidFrom: dateQuery, paidTo: dateQuery,
  cancelled: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : typeof value === 'boolean' ? String(value) : value),
    z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  ),
});
export const accountListQuerySchema = z.object({ q: optionalQuery(z.string().trim().max(191)), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), balanceStatus: optionalQuery(z.enum(balanceStatuses)) });
export const statementQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), from: dateQuery, to: dateQuery, type: optionalQuery(z.enum(statementTypes)) });
