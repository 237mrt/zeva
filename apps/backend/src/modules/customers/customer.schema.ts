import { z } from 'zod';

import { workOrderTypes } from './customer.types.js';

function optionalNullableText(maxLength: number, minLength = 1) {
  return z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().min(minLength).max(maxLength).nullable().optional(),
  );
}

export const customerIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(30),
});

export const customerListQuerySchema = z.object({
  q: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(191).optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2).max(191),
  contactName: optionalNullableText(120),
  phone: optionalNullableText(40, 3),
  address: optionalNullableText(500),
  notes: optionalNullableText(5_000),
});

export const updateCustomerSchema = createCustomerSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'En az bir alan güncellenmelidir.' });

const decimalPattern = /^(?:0|[1-9][0-9]{0,9})(?:[.][0-9]{1,2})?$/;

function toCanonicalDecimal(value: string): string {
  const [whole = '0', fraction = ''] = value.split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

export const replaceCustomerPricesSchema = z
  .object({
    prices: z.array(
      z.object({
        type: z.enum(workOrderTypes),
        unitPrice: z.string().trim().regex(decimalPattern).transform(toCanonicalDecimal),
      }),
    ),
  })
  .superRefine(({ prices }, context) => {
    const seenTypes = new Set<string>();

    prices.forEach((price, index) => {
      if (seenTypes.has(price.type)) {
        context.addIssue({
          code: 'custom',
          message: 'Aynı hizmet türü birden fazla kez gönderilemez.',
          path: ['prices', index, 'type'],
        });
      }
      seenTypes.add(price.type);
    });
  });

export const customerResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'name',
    'contactName',
    'phone',
    'address',
    'notes',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    contactName: { type: ['string', 'null'] },
    phone: { type: ['string', 'null'] },
    address: { type: ['string', 'null'] },
    notes: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    deletedAt: { type: ['string', 'null'], format: 'date-time' },
  },
} as const;

export const customerPriceResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'unitPrice'],
  properties: {
    type: { type: 'string', enum: workOrderTypes },
    unitPrice: { type: 'string', pattern: '^[0-9]{1,10}[.][0-9]{2}$' },
  },
} as const;
