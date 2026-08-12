import type { FastifyPluginCallback } from 'fastify';

import { errorResponseSchema } from '../auth/auth.schema.js';
import { createOperationController } from './operation.controller.js';
import { operationService, type OperationService } from './operation.service.js';
import { packageTypes } from './operation.types.js';

export interface OperationRoutesOptions { service?: OperationService }

const security = [{ cookieAuth: [] }];
const idParams = (name: string) => ({
  type: 'object', additionalProperties: false, required: [name],
  properties: { [name]: { type: 'string', minLength: 1, maxLength: 30 } },
}) as const;
const packageSchema = {
  type: 'object', additionalProperties: false,
  required: ['id', 'workOrderId', 'sequenceNo', 'type', 'quantity', 'deliveryId', 'delivery', 'notes', 'createdAt', 'updatedAt', 'deletedAt'],
  properties: {
    id: { type: 'string' }, workOrderId: { type: 'string' }, sequenceNo: { type: 'integer' },
    type: { type: 'string', enum: packageTypes }, quantity: { type: 'integer' },
    deliveryId: { type: ['string', 'null'] },
    delivery: { anyOf: [{ type: 'null' }, { type: 'object', required: ['id', 'deliveredAt'], properties: { id: { type: 'string' }, deliveredAt: { type: 'string', format: 'date-time' } } }] },
    notes: { type: ['string', 'null'] }, createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }, deletedAt: { type: ['string', 'null'], format: 'date-time' },
  },
} as const;
const workOrderSummarySchema = {
  type: 'object', required: ['id', 'productName', 'status', 'totalQuantity', 'customer'],
  properties: {
    id: { type: 'string' }, productName: { type: 'string' }, status: { type: 'string' }, totalQuantity: { type: 'integer' },
    customer: { type: 'object', required: ['id', 'name'], properties: { id: { type: 'string' }, name: { type: 'string' } } },
  },
} as const;
const summarySchema = {
  type: 'object', required: ['workOrderTotalQuantity', 'packagedQuantity', 'remainingQuantity', 'deliveredQuantity', 'packageCount', 'deliveredPackageCount'],
  properties: {
    workOrderTotalQuantity: { type: 'integer' }, packagedQuantity: { type: 'integer' }, remainingQuantity: { type: 'integer' },
    deliveredQuantity: { type: 'integer' }, packageCount: { type: 'integer' }, deliveredPackageCount: { type: 'integer' },
  },
} as const;
const deliveryPackageSchema = {
  type: 'object', required: ['id', 'workOrderId', 'workOrder', 'sequenceNo', 'type', 'quantity'],
  properties: {
    id: { type: 'string' }, workOrderId: { type: 'string' },
    workOrder: { type: 'object', required: ['id', 'productName'], properties: { id: { type: 'string' }, productName: { type: 'string' } } },
    sequenceNo: { type: 'integer' }, type: { type: 'string', enum: packageTypes }, quantity: { type: 'integer' },
  },
} as const;
const deliverySchema = {
  type: 'object', additionalProperties: false,
  required: ['id', 'customer', 'totalQuantity', 'deliveredAt', 'receiverName', 'notes', 'cancelledAt', 'createdAt', 'updatedAt', 'packages', 'packageCount', 'workOrderCount'],
  properties: {
    id: { type: 'string' },
    customer: { type: 'object', required: ['id', 'name'], properties: { id: { type: 'string' }, name: { type: 'string' } } },
    totalQuantity: { type: 'integer' }, deliveredAt: { type: 'string', format: 'date-time' },
    receiverName: { type: ['string', 'null'] }, notes: { type: ['string', 'null'] }, cancelledAt: { type: ['string', 'null'], format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' },
    packages: { type: 'array', items: deliveryPackageSchema }, packageCount: { type: 'integer' }, workOrderCount: { type: 'integer' },
  },
} as const;
const success = (data: Record<string, unknown>) => ({
  type: 'object', required: ['success', 'data'], additionalProperties: false,
  properties: { success: { type: 'boolean', const: true }, data },
}) as const;
const packageListData = {
  type: 'object', required: ['workOrder', 'packages', 'summary'], additionalProperties: false,
  properties: { workOrder: workOrderSummarySchema, packages: { type: 'array', items: packageSchema }, summary: summarySchema },
} as const;
const packageBody = {
  type: 'object', additionalProperties: false, required: ['type', 'quantity'],
  properties: { type: { type: 'string', enum: packageTypes }, quantity: { type: 'integer', minimum: 1, maximum: 1_000_000 }, notes: { type: ['string', 'null'], maxLength: 2_000 } },
} as const;
const pagination = {
  type: 'object', required: ['page', 'pageSize', 'total', 'totalPages'],
  properties: { page: { type: 'integer' }, pageSize: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } },
} as const;

export const operationRoutes: FastifyPluginCallback<OperationRoutesOptions> = (app, options, done) => {
  const controller = createOperationController(options.service ?? operationService);
  app.addHook('preHandler', (request) => app.authenticate(request));

  app.get('/work-orders/:id/packages', { schema: { operationId: 'listWorkOrderPackages', summary: 'İş emri paketlerini listeler', tags: ['Operations'], security, params: idParams('id'), response: { 200: success(packageListData), 400: errorResponseSchema, 401: errorResponseSchema, 404: errorResponseSchema } }, handler: controller.listPackages });
  app.post('/work-orders/:id/packages', { schema: { operationId: 'createWorkOrderPackages', summary: 'Paketleri toplu oluşturur', tags: ['Operations'], security, params: idParams('id'), body: { type: 'object', additionalProperties: false, required: ['packages'], properties: { packages: { type: 'array', minItems: 1, maxItems: 100, items: packageBody } } }, response: { 201: success(packageListData), 400: errorResponseSchema, 401: errorResponseSchema, 404: errorResponseSchema, 422: errorResponseSchema } }, handler: controller.createPackages });
  app.patch('/work-order-packages/:packageId', { schema: { operationId: 'updateWorkOrderPackage', summary: 'Teslim edilmemiş paketi günceller', tags: ['Operations'], security, params: idParams('packageId'), body: { ...packageBody, required: [], minProperties: 1 }, response: { 200: success({ type: 'object', required: ['package'], properties: { package: packageSchema } }), 400: errorResponseSchema, 401: errorResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema, 422: errorResponseSchema } }, handler: controller.updatePackage });
  app.delete('/work-order-packages/:packageId', { schema: { operationId: 'deleteWorkOrderPackage', summary: 'Teslim edilmemiş paketi soft-delete ile siler', tags: ['Operations'], security, params: idParams('packageId'), response: { 200: success({ type: 'object', additionalProperties: false }), 400: errorResponseSchema, 401: errorResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema } }, handler: controller.deletePackage });

  app.get('/customers/:customerId/deliverable-packages', { schema: { operationId: 'listCustomerDeliverablePackages', summary: 'Müşterinin teslim edilmemiş paketlerini iş emrine göre listeler', tags: ['Deliveries'], security, params: idParams('customerId'), response: { 200: success({ type: 'object', additionalProperties: false, required: ['customer', 'workOrders', 'summary'], properties: { customer: { type: 'object', required: ['id', 'name'], properties: { id: { type: 'string' }, name: { type: 'string' } } }, workOrders: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['workOrder', 'packages'], properties: { workOrder: workOrderSummarySchema, packages: { type: 'array', items: packageSchema } } } }, summary: { type: 'object', additionalProperties: false, required: ['workOrderCount', 'packageCount', 'totalQuantity'], properties: { workOrderCount: { type: 'integer' }, packageCount: { type: 'integer' }, totalQuantity: { type: 'integer' } } } } }), 400: errorResponseSchema, 401: errorResponseSchema, 404: errorResponseSchema } }, handler: controller.listDeliverablePackages });

  app.get('/deliveries', { schema: { operationId: 'listDeliveries', summary: 'Teslimatları listeler', tags: ['Deliveries'], security, querystring: { type: 'object', additionalProperties: false, properties: { q: { type: 'string', maxLength: 191 }, page: { type: 'integer', minimum: 1, default: 1 }, pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 }, customerId: { type: 'string', maxLength: 30 }, workOrderId: { type: 'string', maxLength: 30 }, deliveredFrom: { type: 'string', format: 'date-time' }, deliveredTo: { type: 'string', format: 'date-time' } } }, response: { 200: success({ type: 'object', required: ['items', 'pagination'], properties: { items: { type: 'array', items: deliverySchema }, pagination } }), 400: errorResponseSchema, 401: errorResponseSchema } }, handler: controller.listDeliveries });
  app.post('/deliveries', { schema: { operationId: 'createDelivery', summary: 'Müşterinin seçilen paketleri için teslimat oluşturur', tags: ['Deliveries'], security, body: { type: 'object', additionalProperties: false, required: ['customerId', 'packageIds', 'deliveredAt'], properties: { customerId: { type: 'string', maxLength: 30 }, packageIds: { type: 'array', minItems: 1, maxItems: 100, uniqueItems: true, items: { type: 'string', maxLength: 30 } }, deliveredAt: { type: 'string', format: 'date-time' }, receiverName: { type: ['string', 'null'], maxLength: 120 }, notes: { type: ['string', 'null'], maxLength: 5_000 } } }, response: { 201: success({ type: 'object', required: ['delivery'], properties: { delivery: deliverySchema } }), 400: errorResponseSchema, 401: errorResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema, 422: errorResponseSchema } }, handler: controller.createDelivery });
  app.get('/deliveries/:id', { schema: { operationId: 'getDelivery', summary: 'Teslimat detayını getirir', tags: ['Deliveries'], security, params: idParams('id'), response: { 200: success({ type: 'object', required: ['delivery'], properties: { delivery: deliverySchema } }), 400: errorResponseSchema, 401: errorResponseSchema, 404: errorResponseSchema } }, handler: controller.getDelivery });
  app.post('/deliveries/:id/cancel', { schema: { operationId: 'cancelDelivery', summary: 'Teslimatı iptal eder ve paketleri serbest bırakır', tags: ['Deliveries'], security, params: idParams('id'), response: { 200: success({ type: 'object', required: ['delivery'], properties: { delivery: deliverySchema } }), 400: errorResponseSchema, 401: errorResponseSchema, 404: errorResponseSchema, 409: errorResponseSchema } }, handler: controller.cancelDelivery });
  done();
};
