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

    const document = response.json<unknown>();
    expect(document).toMatchObject({
      openapi: '3.1.0',
      info: {
        title: 'Zeva API',
        version: '0.1.0',
      },
      paths: {
        '/api/v1/auth/login': { post: {} },
        '/api/v1/auth/me': { get: {} },
        '/api/v1/customers': { get: {}, post: {} },
        '/api/v1/customers/trash': { get: {} },
        '/api/v1/customers/{id}': { get: {}, patch: {}, delete: {} },
        '/api/v1/customers/{id}/restore': { post: {} },
        '/api/v1/customers/{id}/prices': { get: {}, put: {} },
      },
      components: {
        securitySchemes: {
          cookieAuth: { type: 'apiKey', in: 'cookie' },
        },
      },
    });
    expect(document).not.toHaveProperty(['components', 'securitySchemes', 'bearerAuth']);
    expect(document).toHaveProperty(
      ['paths', '/api/v1/auth/me', 'get', 'security'],
      [{ cookieAuth: [] }],
    );
    expect(document).not.toHaveProperty([
      'paths',
      '/api/v1/auth/login',
      'post',
      'responses',
      '200',
      'content',
      'application/json',
      'schema',
      'properties',
      'data',
      'properties',
      'accessToken',
    ]);
    expect(document).toHaveProperty(
      ['paths', '/api/v1/customers', 'get', 'security'],
      [{ cookieAuth: [] }],
    );
    expect(document).toHaveProperty(
      ['paths', '/api/v1/customers/{id}/prices', 'put', 'security'],
      [{ cookieAuth: [] }],
    );
  });
});
