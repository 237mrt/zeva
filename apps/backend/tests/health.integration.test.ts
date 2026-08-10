import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import type { HealthData } from '../src/modules/health/health.controller.js';
import type { SuccessResponse } from '../src/shared/http/api-response.js';

describe('GET /api/v1/health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('servis durumunu standart başarı cevabıyla döndürür', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });
    const body = response.json<SuccessResponse<HealthData>>();

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(body).toMatchObject({
      success: true,
      data: {
        status: 'ok',
        service: 'zeva-backend',
        version: '0.1.0',
      },
    });
    expect(Number.isNaN(Date.parse(body.data.timestamp))).toBe(false);
  });
});
