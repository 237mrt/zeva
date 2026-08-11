import type { FastifyPluginCallback } from 'fastify';

import { errorResponseSchema } from '../auth/auth.schema.js';
import { workOrderTypes } from '../customers/customer.types.js';
import { createWorkOrderController } from './work-order.controller.js';
import { workOrderResponseSchema } from './work-order.schema.js';
import { workOrderService } from './work-order.service.js';
import type { WorkOrderService } from './work-order.service.js';
import { workOrderStatuses } from './work-order.types.js';

export interface WorkOrderRoutesOptions {
  service?: WorkOrderService;
}

const cookieSecurity = [{ cookieAuth: [] }];
const idParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id'],
  properties: { id: { type: 'string', minLength: 1, maxLength: 30 } },
} as const;
const listQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    q: { type: 'string', maxLength: 191 },
    page: { type: 'integer', minimum: 1, default: 1 },
    pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    customerId: { type: 'string', minLength: 1, maxLength: 30 },
    type: { type: 'string', enum: workOrderTypes },
    status: { type: 'string', enum: workOrderStatuses },
  },
} as const;
const writeProperties = {
  customerId: { type: 'string', minLength: 1, maxLength: 30 },
  productName: { type: 'string', minLength: 2, maxLength: 191 },
  type: { type: 'string', enum: workOrderTypes },
  totalQuantity: { type: 'integer', minimum: 1, maximum: 1_000_000 },
  unitPrice: {
    type: 'string',
    pattern: '^(?:0|[1-9][0-9]{0,9})(?:[.][0-9]{1,2})?$',
  },
  receivedAt: { type: 'string', format: 'date-time' },
  dueAt: { type: ['string', 'null'], format: 'date-time' },
  notes: { type: ['string', 'null'], maxLength: 5_000 },
} as const;
const createBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['customerId', 'productName', 'type', 'totalQuantity', 'receivedAt'],
  properties: writeProperties,
} as const;
const updateBodySchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: writeProperties,
} as const;
const statusBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status'],
  properties: { status: { type: 'string', enum: workOrderStatuses } },
} as const;
const paginationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['page', 'pageSize', 'total', 'totalPages'],
  properties: {
    page: { type: 'integer' },
    pageSize: { type: 'integer' },
    total: { type: 'integer' },
    totalPages: { type: 'integer' },
  },
} as const;

function successSchema(data: Record<string, unknown>) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['success', 'data'],
    properties: { success: { type: 'boolean', const: true }, data },
  } as const;
}

const listSuccessResponseSchema = successSchema({
  type: 'object',
  additionalProperties: false,
  required: ['items', 'pagination'],
  properties: {
    items: { type: 'array', items: workOrderResponseSchema },
    pagination: paginationSchema,
  },
});
const workOrderSuccessResponseSchema = successSchema({
  type: 'object',
  additionalProperties: false,
  required: ['workOrder'],
  properties: { workOrder: workOrderResponseSchema },
});
const emptySuccessResponseSchema = successSchema({
  type: 'object',
  additionalProperties: false,
});

export const workOrderRoutes: FastifyPluginCallback<WorkOrderRoutesOptions> = (
  app,
  options,
  done,
) => {
  const controller = createWorkOrderController(options.service ?? workOrderService);
  app.addHook('preHandler', (request) => app.authenticate(request));

  app.get('/work-orders', {
    schema: {
      operationId: 'listWorkOrders',
      summary: 'Aktif iş emirlerini listeler',
      description: 'İş emirlerini arama, müşteri, hizmet türü, durum ve sayfalama filtreleriyle döndürür.',
      tags: ['Work Orders'],
      security: cookieSecurity,
      querystring: listQuerySchema,
      response: {
        200: listSuccessResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
      },
    },
    handler: controller.list,
  });

  app.post('/work-orders', {
    schema: {
      operationId: 'createWorkOrder',
      summary: 'Yeni iş emri oluşturur',
      description: 'Birim fiyat verilmezse aktif müşterinin hizmet türü varsayılanını kullanır; toplam tutarı backend hesaplar.',
      tags: ['Work Orders'],
      security: cookieSecurity,
      body: createBodySchema,
      response: {
        201: workOrderSuccessResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
        422: errorResponseSchema,
      },
    },
    handler: controller.create,
  });

  app.get('/work-orders/trash', {
    schema: {
      operationId: 'listDeletedWorkOrders',
      summary: 'Silinmiş iş emirlerini listeler',
      tags: ['Work Orders'],
      security: cookieSecurity,
      querystring: listQuerySchema,
      response: {
        200: listSuccessResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
      },
    },
    handler: controller.trash,
  });

  app.get('/work-orders/:id', {
    schema: {
      operationId: 'getWorkOrder',
      summary: 'Aktif iş emri detayını getirir',
      tags: ['Work Orders'],
      security: cookieSecurity,
      params: idParamsSchema,
      response: {
        200: workOrderSuccessResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: controller.get,
  });

  app.patch('/work-orders/:id', {
    schema: {
      operationId: 'updateWorkOrder',
      summary: 'Aktif iş emrini günceller',
      description: 'Status dışında temel alanları günceller ve toplam tutarı backend tarafında yeniden hesaplar.',
      tags: ['Work Orders'],
      security: cookieSecurity,
      params: idParamsSchema,
      body: updateBodySchema,
      response: {
        200: workOrderSuccessResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
        422: errorResponseSchema,
      },
    },
    handler: controller.update,
  });

  app.patch('/work-orders/:id/status', {
    schema: {
      operationId: 'updateWorkOrderStatus',
      summary: 'İş emri durumunu değiştirir',
      tags: ['Work Orders'],
      security: cookieSecurity,
      params: idParamsSchema,
      body: statusBodySchema,
      response: {
        200: workOrderSuccessResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: controller.updateStatus,
  });

  app.delete('/work-orders/:id', {
    schema: {
      operationId: 'deleteWorkOrder',
      summary: 'İş emrini soft-delete ile siler',
      tags: ['Work Orders'],
      security: cookieSecurity,
      params: idParamsSchema,
      response: {
        200: emptySuccessResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: controller.remove,
  });

  app.post('/work-orders/:id/restore', {
    schema: {
      operationId: 'restoreWorkOrder',
      summary: 'Silinmiş iş emrini geri yükler',
      tags: ['Work Orders'],
      security: cookieSecurity,
      params: idParamsSchema,
      response: {
        200: workOrderSuccessResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
        409: errorResponseSchema,
      },
    },
    handler: controller.restore,
  });

  done();
};
