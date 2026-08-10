import type { FastifyPluginCallback } from 'fastify';

import { getHealth } from './health.controller.js';

const healthResponseSchema = {
  type: 'object',
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean', const: true },
    data: {
      type: 'object',
      required: ['status', 'service', 'version', 'timestamp'],
      properties: {
        status: { type: 'string', const: 'ok' },
        service: { type: 'string', const: 'zeva-backend' },
        version: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  },
} as const;

export const healthRoutes: FastifyPluginCallback = (app, _options, done) => {
  app.get('/health', {
    schema: {
      operationId: 'getHealth',
      summary: 'Servis durumunu getirir',
      description: 'Backend servisinin çalıştığını doğrulamak için kullanılır.',
      tags: ['System'],
      response: {
        200: healthResponseSchema,
      },
    },
    handler: getHealth,
  });

  done();
};
