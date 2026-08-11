import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';

import { loggerConfiguration } from './config/logger.js';
import { prisma } from './lib/prisma.js';
import { registerErrorHandlers } from './plugins/error-handler.js';
import { apiV1Routes } from './routes/api-v1.js';

export interface BuildAppOptions {
  logger?: FastifyServerOptions['logger'];
  documentation?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? loggerConfiguration });

  registerErrorHandlers(app);
  if (options.documentation ?? true) {
    const { registerSwagger } = await import('./plugins/swagger.js');
    await registerSwagger(app);
  }
  await app.register(apiV1Routes, { prefix: '/api/v1' });

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return app;
}
