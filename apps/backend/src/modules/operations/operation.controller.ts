import type { FastifyReply, FastifyRequest } from 'fastify';

import { successResponse } from '../../shared/http/api-response.js';
import {
  createDeliverySchema,
  createPackageBatchSchema,
  deliveryIdParamsSchema,
  deliveryListQuerySchema,
  customerDeliverablePackagesParamsSchema,
  packageIdParamsSchema,
  updatePackageSchema,
  workOrderPackageParamsSchema,
} from './operation.schema.js';
import type { OperationService } from './operation.service.js';

export function createOperationController(service: OperationService) {
  return {
    listPackages: async (request: FastifyRequest) => {
      const { id } = workOrderPackageParamsSchema.parse(request.params);
      return successResponse(await service.listPackages(id));
    },
    createPackages: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = workOrderPackageParamsSchema.parse(request.params);
      const { packages } = createPackageBatchSchema.parse(request.body);
      return reply.status(201).send(successResponse(await service.createPackages(id, packages)));
    },
    updatePackage: async (request: FastifyRequest) => {
      const { packageId } = packageIdParamsSchema.parse(request.params);
      const input = updatePackageSchema.parse(request.body);
      return successResponse({ package: await service.updatePackage(packageId, input) });
    },
    deletePackage: async (request: FastifyRequest) => {
      const { packageId } = packageIdParamsSchema.parse(request.params);
      await service.deletePackage(packageId);
      return successResponse({});
    },
    listDeliveries: async (request: FastifyRequest) => {
      const query = deliveryListQuerySchema.parse(request.query);
      return successResponse(await service.listDeliveries(query));
    },
    listDeliverablePackages: async (request: FastifyRequest) => {
      const { customerId } = customerDeliverablePackagesParamsSchema.parse(request.params);
      return successResponse(await service.listDeliverablePackages(customerId));
    },
    getDelivery: async (request: FastifyRequest) => {
      const { id } = deliveryIdParamsSchema.parse(request.params);
      return successResponse({ delivery: await service.getDelivery(id) });
    },
    createDelivery: async (request: FastifyRequest, reply: FastifyReply) => {
      const input = createDeliverySchema.parse(request.body);
      const delivery = await service.createDelivery({
        ...input,
        deliveredAt: new Date(input.deliveredAt),
        receiverName: input.receiverName ?? null,
        notes: input.notes ?? null,
      });
      return reply.status(201).send(successResponse({ delivery }));
    },
    cancelDelivery: async (request: FastifyRequest) => {
      const { id } = deliveryIdParamsSchema.parse(request.params);
      return successResponse({ delivery: await service.cancelDelivery(id) });
    },
  };
}
