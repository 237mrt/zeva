import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';

import { loggerConfiguration } from './config/logger.js';
import { prisma } from './lib/prisma.js';
import type { AuthService } from './modules/auth/auth.service.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { registerErrorHandlers } from './plugins/error-handler.js';
import { apiV1Routes } from './routes/api-v1.js';

export interface BuildAppOptions {
  logger?: FastifyServerOptions['logger'];
  documentation?: boolean;
  authService?: AuthService;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? loggerConfiguration });

  registerErrorHandlers(app);
  await registerAuthPlugin(app);
  if (options.documentation ?? true) {
    const { registerSwagger } = await import('./plugins/swagger.js');
    await registerSwagger(app);
  }
  await app.register(apiV1Routes, {
    prefix: '/api/v1',
    ...(options.authService ? { authService: options.authService } : {}),
  });

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return app;
}
