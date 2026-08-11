import type { FastifyReply, FastifyRequest } from 'fastify';

import { successResponse } from '../../shared/http/api-response.js';
import {
  createCustomerSchema,
  customerIdParamsSchema,
  customerListQuerySchema,
  replaceCustomerPricesSchema,
  updateCustomerSchema,
} from './customer.schema.js';
import type { CustomerService } from './customer.service.js';

export function createCustomerController(service: CustomerService) {
  return {
    list: async (request: FastifyRequest) => {
      const query = customerListQuerySchema.parse(request.query);
      return successResponse(await service.list(query));
    },
    trash: async (request: FastifyRequest) => {
      const query = customerListQuerySchema.parse(request.query);
      return successResponse(await service.list(query, true));
    },
    create: async (request: FastifyRequest, reply: FastifyReply) => {
      const input = createCustomerSchema.parse(request.body);
      const customer = await service.create(input);
      return reply.status(201).send(successResponse({ customer }));
    },
    get: async (request: FastifyRequest) => {
      const { id } = customerIdParamsSchema.parse(request.params);
      return successResponse({ customer: await service.get(id) });
    },
    update: async (request: FastifyRequest) => {
      const { id } = customerIdParamsSchema.parse(request.params);
      const input = updateCustomerSchema.parse(request.body);
      return successResponse({ customer: await service.update(id, input) });
    },
    remove: async (request: FastifyRequest) => {
      const { id } = customerIdParamsSchema.parse(request.params);
      await service.remove(id);
      return successResponse({});
    },
    restore: async (request: FastifyRequest) => {
      const { id } = customerIdParamsSchema.parse(request.params);
      return successResponse({ customer: await service.restore(id) });
    },
    getPrices: async (request: FastifyRequest) => {
      const { id } = customerIdParamsSchema.parse(request.params);
      return successResponse({ prices: await service.getPrices(id) });
    },
    replacePrices: async (request: FastifyRequest) => {
      const { id } = customerIdParamsSchema.parse(request.params);
      const { prices } = replaceCustomerPricesSchema.parse(request.body);
      return successResponse({ prices: await service.replacePrices(id, prices) });
    },
  };
}
