import type { FastifyPluginAsync } from 'fastify';

import { healthRoutes } from '../modules/health/health.route.js';

export const apiV1Routes: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes);
};
