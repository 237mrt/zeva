import type { FastifyPluginAsync } from 'fastify';

import { authRoutes } from '../modules/auth/auth.route.js';
import type { AuthService } from '../modules/auth/auth.service.js';
import { customerRoutes } from '../modules/customers/customer.route.js';
import type { CustomerService } from '../modules/customers/customer.service.js';
import { healthRoutes } from '../modules/health/health.route.js';

interface ApiV1RoutesOptions {
  authService?: AuthService;
  customerService?: CustomerService;
}

export const apiV1Routes: FastifyPluginAsync<ApiV1RoutesOptions> = async (app, options) => {
  app.register(healthRoutes);
  await app.register(authRoutes, {
    prefix: '/auth',
    ...(options.authService ? { service: options.authService } : {}),
  });
  await app.register(customerRoutes, {
    ...(options.customerService ? { service: options.customerService } : {}),
  });
};
