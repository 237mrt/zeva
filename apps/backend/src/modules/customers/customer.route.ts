import type { FastifyPluginCallback } from 'fastify';

import { errorResponseSchema } from '../auth/auth.schema.js';
import { createCustomerController } from './customer.controller.js';
import {
  customerPriceResponseSchema,
  customerResponseSchema,
} from './customer.schema.js';
import { customerService } from './customer.service.js';
import type { CustomerService } from './customer.service.js';
import { workOrderTypes } from './customer.types.js';

export interface CustomerRoutesOptions {
  service?: CustomerService;
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
  },
} as const;
const customerWriteProperties = {
  name: { type: 'string', minLength: 2, maxLength: 191 },
  contactName: { type: ['string', 'null'], maxLength: 120 },
  phone: { type: ['string', 'null'], maxLength: 40 },
  address: { type: ['string', 'null'], maxLength: 500 },
  notes: { type: ['string', 'null'], maxLength: 5_000 },
} as const;
const createCustomerBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name'],
  properties: customerWriteProperties,
} as const;
const updateCustomerBodySchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: customerWriteProperties,
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
    properties: {
      success: { type: 'boolean', const: true },
      data,
    },
  } as const;
}

const listSuccessResponseSchema = successSchema({
  type: 'object',
  additionalProperties: false,
  required: ['items', 'pagination'],
  properties: {
    items: { type: 'array', items: customerResponseSchema },
    pagination: paginationSchema,
  },
});
const customerSuccessResponseSchema = successSchema({
  type: 'object',
  additionalProperties: false,
  required: ['customer'],
  properties: { customer: customerResponseSchema },
});
const emptySuccessResponseSchema = successSchema({
  type: 'object',
  additionalProperties: false,
});
const pricesSuccessResponseSchema = successSchema({
  type: 'object',
  additionalProperties: false,
  required: ['prices'],
  properties: {
    prices: { type: 'array', items: customerPriceResponseSchema },
  },
});
const replacePricesBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['prices'],
  properties: {
    prices: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'unitPrice'],
        properties: {
          type: { type: 'string', enum: workOrderTypes },
          unitPrice: {
            type: 'string',
            pattern: '^(?:0|[1-9][0-9]{0,9})(?:[.][0-9]{1,2})?$',
          },
        },
      },
    },
  },
} as const;

export const customerRoutes: FastifyPluginCallback<CustomerRoutesOptions> = (
  app,
  options,
  done,
) => {
  const controller = createCustomerController(options.service ?? customerService);

  app.addHook('preHandler', (request) => app.authenticate(request));

  app.get('/customers', {
    schema: {
      operationId: 'listCustomers',
      summary: 'Aktif müşterileri listeler',
      description: 'Aktif müşterileri arama ve sayfalama desteğiyle döndürür.',
      tags: ['Customers'],
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

  app.post('/customers', {
    schema: {
      operationId: 'createCustomer',
      summary: 'Yeni müşteri oluşturur',
      tags: ['Customers'],
      security: cookieSecurity,
      body: createCustomerBodySchema,
      response: {
        201: customerSuccessResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
      },
    },
    handler: controller.create,
  });

  app.get('/customers/trash', {
    schema: {
      operationId: 'listDeletedCustomers',
      summary: 'Silinmiş müşterileri listeler',
      tags: ['Customers'],
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

  app.get('/customers/:id', {
    schema: {
      operationId: 'getCustomer',
      summary: 'Aktif müşteri detayını getirir',
      tags: ['Customers'],
      security: cookieSecurity,
      params: idParamsSchema,
      response: {
        200: customerSuccessResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: controller.get,
  });

  app.patch('/customers/:id', {
    schema: {
      operationId: 'updateCustomer',
      summary: 'Aktif müşteriyi günceller',
      tags: ['Customers'],
      security: cookieSecurity,
      params: idParamsSchema,
      body: updateCustomerBodySchema,
      response: {
        200: customerSuccessResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: controller.update,
  });

  app.delete('/customers/:id', {
    schema: {
      operationId: 'deleteCustomer',
      summary: 'Müşteriyi soft-delete ile siler',
      tags: ['Customers'],
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

  app.post('/customers/:id/restore', {
    schema: {
      operationId: 'restoreCustomer',
      summary: 'Silinmiş müşteriyi geri yükler',
      tags: ['Customers'],
      security: cookieSecurity,
      params: idParamsSchema,
      response: {
        200: customerSuccessResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
        409: errorResponseSchema,
      },
    },
    handler: controller.restore,
  });

  app.get('/customers/:id/prices', {
    schema: {
      operationId: 'getCustomerPrices',
      summary: 'Müşterinin varsayılan hizmet fiyatlarını getirir',
      tags: ['Customer Prices'],
      security: cookieSecurity,
      params: idParamsSchema,
      response: {
        200: pricesSuccessResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: controller.getPrices,
  });

  app.put('/customers/:id/prices', {
    schema: {
      operationId: 'replaceCustomerPrices',
      summary: 'Müşterinin varsayılan hizmet fiyat setini değiştirir',
      description: 'Gönderilen dizi fiyat setinin tamamıdır; eksik türler kaldırılır.',
      tags: ['Customer Prices'],
      security: cookieSecurity,
      params: idParamsSchema,
      body: replacePricesBodySchema,
      response: {
        200: pricesSuccessResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: controller.replacePrices,
  });
  done();
};
