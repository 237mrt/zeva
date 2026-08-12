import { z } from 'zod';

import { workOrderTypes } from '../customers/customer.types.js';
import { workOrderStatuses } from './work-order.types.js';

const decimalPattern = /^(?:0|[1-9][0-9]{0,9})(?:[.][0-9]{1,2})?$/;

function toCanonicalDecimal(value: string): string {
  const [whole = '0', fraction = ''] = value.split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

const decimalSchema = z.string().trim().regex(decimalPattern).transform(toCanonicalDecimal);
const isoDateTimeSchema = z.string().datetime({ offset: true });

function optionalNullableText(maxLength: number) {
  return z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().min(1).max(maxLength).nullable().optional(),
  );
}

const optionalNullableDateTime = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  isoDateTimeSchema.nullable().optional(),
);

export const workOrderIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(30),
});

export const workOrderListQuerySchema = z.object({
  q: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(191).optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  customerId: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(1).max(30).optional(),
  ),
  type: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(workOrderTypes).optional(),
  ),
  status: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(workOrderStatuses).optional(),
  ),
});

const workOrderWriteShape = {
  customerId: z.string().trim().min(1).max(30),
  productName: z.string().trim().min(2).max(191),
  type: z.enum(workOrderTypes),
  totalQuantity: z.number().int().min(1).max(1_000_000),
  unitPrice: decimalSchema.optional(),
  receivedAt: isoDateTimeSchema,
  dueAt: optionalNullableDateTime,
  notes: optionalNullableText(5_000),
};

export const createWorkOrderSchema = z.object(workOrderWriteShape).superRefine((input, context) => {
  if (input.dueAt && new Date(input.dueAt) < new Date(input.receivedAt)) {
    context.addIssue({
      code: 'custom',
      message: 'Termin tarihi alınma tarihinden önce olamaz.',
      path: ['dueAt'],
    });
  }
});

export const updateWorkOrderSchema = z
  .object(workOrderWriteShape)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'En az bir alan güncellenmelidir.',
  });

export const updateWorkOrderStatusSchema = z.object({
  status: z.enum(workOrderStatuses),
});

export const workOrderCustomerSummaryResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
  },
} as const;

export const workOrderResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'customerId',
    'customer',
    'productName',
    'type',
    'status',
    'totalQuantity',
    'unitPrice',
    'totalAmount',
    'receivedAt',
    'dueAt',
    'notes',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ],
  properties: {
    id: { type: 'string' },
    customerId: { type: 'string' },
    customer: workOrderCustomerSummaryResponseSchema,
    productName: { type: 'string' },
    type: { type: 'string', enum: workOrderTypes },
    status: { type: 'string', enum: workOrderStatuses },
    totalQuantity: { type: 'integer' },
    unitPrice: { type: 'string', pattern: '^[0-9]{1,10}[.][0-9]{2}$' },
    totalAmount: { type: 'string', pattern: '^[0-9]{1,16}[.][0-9]{2}$' },
    receivedAt: { type: 'string', format: 'date-time' },
    dueAt: { type: ['string', 'null'], format: 'date-time' },
    notes: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    deletedAt: { type: ['string', 'null'], format: 'date-time' },
  },
} as const;
