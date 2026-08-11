import type { FastifyPluginCallback } from 'fastify';

import { createAuthController } from './auth.controller.js';
import { authUserResponseSchema, errorResponseSchema } from './auth.schema.js';
import { authService } from './auth.service.js';
import type { AuthService } from './auth.service.js';

export interface AuthRoutesOptions {
  service?: AuthService;
}

const loginSuccessResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean', const: true },
    data: {
      type: 'object',
      additionalProperties: false,
      required: ['accessToken', 'user'],
      properties: {
        accessToken: { type: 'string' },
        user: authUserResponseSchema,
      },
    },
  },
} as const;

const meSuccessResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean', const: true },
    data: {
      type: 'object',
      additionalProperties: false,
      required: ['user'],
      properties: {
        user: authUserResponseSchema,
      },
    },
  },
} as const;

const logoutSuccessResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean', const: true },
    data: {
      type: 'object',
      additionalProperties: false,
    },
  },
} as const;

export const authRoutes: FastifyPluginCallback<AuthRoutesOptions> = (app, options, done) => {
  const controller = createAuthController(options.service ?? authService);

  app.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
      },
    },
    schema: {
      operationId: 'login',
      summary: 'Yönetici oturumu açar',
      description: 'E-posta ve şifreyle doğrulama yapar; JWT erişim tokenı ve HttpOnly oturum cookie’si üretir.',
      tags: ['Authentication'],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', maxLength: 191 },
          password: { type: 'string', minLength: 1, maxLength: 256 },
        },
      },
      response: {
        200: loginSuccessResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        429: errorResponseSchema,
      },
    },
    handler: controller.login,
  });

  app.post('/logout', {
    schema: {
      operationId: 'logout',
      summary: 'Tarayıcı oturumunu kapatır',
      description: 'HttpOnly oturum cookie’sini güvenli biçimde temizler.',
      tags: ['Authentication'],
      response: {
        200: logoutSuccessResponseSchema,
      },
    },
    handler: controller.logout,
  });

  app.get('/me', {
    preHandler: (request) => app.authenticate(request),
    schema: {
      operationId: 'getCurrentUser',
      summary: 'Aktif oturum kullanıcısını getirir',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
      response: {
        200: meSuccessResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
      },
    },
    handler: controller.me,
  });

  done();
};
