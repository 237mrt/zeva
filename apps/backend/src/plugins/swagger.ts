import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

import { authCookieName } from './auth.js';

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
        { name: 'Customers', description: 'Müşteri kayıtları ve soft-delete yaşam döngüsü' },
        { name: 'Customer Prices', description: 'Müşteri bazlı varsayılan hizmet fiyatları' },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: authCookieName,
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
