import { z } from 'zod';

import { packageTypes } from './operation.types.js';

const idSchema = z.string().trim().min(1).max(30);
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().min(1).max(max).nullable().optional(),
  );

export const workOrderPackageParamsSchema = z.object({ id: idSchema });
export const packageIdParamsSchema = z.object({ packageId: idSchema });
export const deliveryIdParamsSchema = z.object({ id: idSchema });
export const customerDeliverablePackagesParamsSchema = z.object({ customerId: idSchema });

export const packageWriteSchema = z.object({
  type: z.enum(packageTypes),
  quantity: z.number().int().min(1).max(1_000_000),
  notes: optionalText(2_000),
});

export const createPackageBatchSchema = z.object({
  packages: z.array(packageWriteSchema).min(1).max(100),
});

export const updatePackageSchema = packageWriteSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'En az bir alan güncellenmelidir.');

export const createDeliverySchema = z.object({
  customerId: idSchema,
  packageIds: z.array(idSchema).min(1).max(100).superRefine((ids, context) => {
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: 'custom', message: 'Aynı paket birden fazla seçilemez.' });
    }
  }),
  deliveredAt: z.string().datetime({ offset: true }),
  receiverName: optionalText(120),
  notes: optionalText(5_000),
});

export const deliveryListQuerySchema = z.object({
  q: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(191).optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  customerId: z.preprocess((value) => (value === '' ? undefined : value), idSchema.optional()),
  workOrderId: z.preprocess((value) => (value === '' ? undefined : value), idSchema.optional()),
  deliveredFrom: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().datetime({ offset: true }).transform((value) => new Date(value)).optional(),
  ),
  deliveredTo: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().datetime({ offset: true }).transform((value) => new Date(value)).optional(),
  ),
});
