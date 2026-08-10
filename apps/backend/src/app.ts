import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';

import { loggerConfiguration } from './config/logger.js';
import { prisma } from './lib/prisma.js';
import { registerErrorHandlers } from './plugins/error-handler.js';
import { registerSwagger } from './plugins/swagger.js';
import { apiV1Routes } from './routes/api-v1.js';

export interface BuildAppOptions {
  logger?: FastifyServerOptions['logger'];
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? loggerConfiguration });

  registerErrorHandlers(app);
  await registerSwagger(app);
  await app.register(apiV1Routes, { prefix: '/api/v1' });

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return app;
}
