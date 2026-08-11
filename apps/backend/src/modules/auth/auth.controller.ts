import type { FastifyReply, FastifyRequest } from 'fastify';

import { env } from '../../config/env.js';
import { authCookieName, jwtExpiresInSeconds } from '../../plugins/auth.js';
import { successResponse } from '../../shared/http/api-response.js';
import { loginSchema } from './auth.schema.js';
import type { AuthService } from './auth.service.js';

export function createAuthController(service: AuthService) {
  return {
    login: async (request: FastifyRequest, reply: FastifyReply) => {
      const input = loginSchema.parse(request.body);
      const user = await service.login(input);
      const accessToken = await reply.jwtSign({ sub: user.id, role: user.role });

      reply.setCookie(authCookieName, accessToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure: env.NODE_ENV === 'production',
        path: '/',
        maxAge: jwtExpiresInSeconds(env.JWT_EXPIRES_IN),
      });

      return successResponse({ accessToken, user });
    },
    me: async (request: FastifyRequest) => {
      const user = await service.getCurrentUser(request.user.sub);
      return successResponse({ user });
    },
  };
}
