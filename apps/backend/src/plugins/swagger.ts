import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

export async function registerSwagger(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Zeva API',
        description: 'Zeva tekstil atölyesi yönetim sistemi API dokümantasyonu.',
        version: '0.1.0',
      },
      tags: [
        { name: 'System', description: 'Sistem durumu endpointleri' },
        { name: 'Authentication', description: 'Yönetici oturumu ve kimlik doğrulama endpointleri' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'zeva_access_token',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}
