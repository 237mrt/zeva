import type { FastifyReply, FastifyRequest } from 'fastify';

import { successResponse } from '../../shared/http/api-response.js';
import {
  createWorkOrderSchema,
  updateWorkOrderSchema,
  updateWorkOrderStatusSchema,
  workOrderIdParamsSchema,
  workOrderListQuerySchema,
} from './work-order.schema.js';
import type { WorkOrderService } from './work-order.service.js';

export function createWorkOrderController(service: WorkOrderService) {
  return {
    list: async (request: FastifyRequest) => {
      const query = workOrderListQuerySchema.parse(request.query);
      return successResponse(await service.list(query));
    },
    trash: async (request: FastifyRequest) => {
      const query = workOrderListQuerySchema.parse(request.query);
      return successResponse(await service.list(query, true));
    },
    create: async (request: FastifyRequest, reply: FastifyReply) => {
      const input = createWorkOrderSchema.parse(request.body);
      const workOrder = await service.create(input);
      return reply.status(201).send(successResponse({ workOrder }));
    },
    get: async (request: FastifyRequest) => {
      const { id } = workOrderIdParamsSchema.parse(request.params);
      return successResponse({ workOrder: await service.get(id) });
    },
    update: async (request: FastifyRequest) => {
      const { id } = workOrderIdParamsSchema.parse(request.params);
      const input = updateWorkOrderSchema.parse(request.body);
      return successResponse({ workOrder: await service.update(id, input) });
    },
    updateStatus: async (request: FastifyRequest) => {
      const { id } = workOrderIdParamsSchema.parse(request.params);
      const { status } = updateWorkOrderStatusSchema.parse(request.body);
      return successResponse({ workOrder: await service.updateStatus(id, status) });
    },
    remove: async (request: FastifyRequest) => {
      const { id } = workOrderIdParamsSchema.parse(request.params);
      await service.remove(id);
      return successResponse({});
    },
    restore: async (request: FastifyRequest) => {
      const { id } = workOrderIdParamsSchema.parse(request.params);
      return successResponse({ workOrder: await service.restore(id) });
    },
  };
}
