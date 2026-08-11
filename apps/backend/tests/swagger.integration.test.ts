import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

describe('Swagger integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('OpenAPI dokümanını Swagger UI üzerinden sunar', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.json()).toMatchObject({
      openapi: '3.1.0',
      info: {
        title: 'Zeva API',
        version: '0.1.0',
      },
      paths: {
        '/api/v1/auth/login': { post: {} },
        '/api/v1/auth/me': { get: {} },
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer' },
          cookieAuth: { type: 'apiKey', in: 'cookie' },
        },
      },
    });
  });
});
