import { z } from 'zod';
import { workOrderTypes } from '../customers/customer.types.js';
import { workOrderStatuses } from '../work-orders/work-order.types.js';

const id = z.string().trim().min(1).max(30);
const date = z.string().datetime({ offset: true }).transform((value) => new Date(value));
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess((value) => value === '' ? undefined : value, schema.optional());
const pagination = { page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) };
const range = z.object({ from: date, to: date }).refine((value) => value.from <= value.to, { message: 'Başlangıç tarihi bitiş tarihinden sonra olamaz.' });

export const workOrderReportQuerySchema = range.extend({ ...pagination, customerId: optional(id), type: optional(z.enum(workOrderTypes)), status: optional(z.enum(workOrderStatuses)) });
export const deliveryReportQuerySchema = range.extend({ ...pagination, customerId: optional(id), workOrderId: optional(id) });
export const financeReportQuerySchema = range;
export const customerReportQuerySchema = range.extend({ ...pagination, q: optional(z.string().trim().max(191)) });
export const reportingIdParamsSchema = z.object({ id });
export const accountPdfParamsSchema = z.object({ customerId: id });
export const accountPdfQuerySchema = z.object({ from: optional(date), to: optional(date) }).refine((value) => !value.from || !value.to || value.from <= value.to, { message: 'Başlangıç tarihi bitiş tarihinden sonra olamaz.' });
