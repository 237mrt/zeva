import type { FastifyPluginCallback } from 'fastify';

import { healthRoutes } from '../modules/health/health.route.js';

export const apiV1Routes: FastifyPluginCallback = (app, _options, done) => {
  app.register(healthRoutes);
  done();
};
