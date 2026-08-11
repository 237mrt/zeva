import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import { env } from '../config/env.js';
import type { AuthTokenPayload } from '../modules/auth/auth.types.js';
import { AppError } from '../shared/errors/app-error.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthTokenPayload;
    user: AuthTokenPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest): Promise<void>;
  }
}

export const authCookieName =
  env.NODE_ENV === 'production' ? '__Host-zeva_access_token' : 'zeva_access_token';

export function jwtExpiresInSeconds(value: string): number {
  const amount = Number.parseInt(value.slice(0, -1), 10);
  const unit = value.at(-1);
  const secondsPerUnit: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3_600,
    d: 86_400,
  };

  return amount * (secondsPerUnit[unit ?? ''] ?? 0);
}

export async function registerAuthPlugin(app: FastifyInstance): Promise<void> {
  await app.register(cookie);
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: authCookieName,
      signed: false,
    },
    sign: {
      algorithm: 'HS256',
      expiresIn: env.JWT_EXPIRES_IN,
      iss: 'zeva-backend',
      aud: 'zeva-web',
    },
    verify: {
      allowedIss: 'zeva-backend',
      allowedAud: 'zeva-web',
    },
  });
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: () =>
      new AppError(
        429,
        'RATE_LIMIT_EXCEEDED',
        'Çok fazla giriş denemesi yapıldı. Lütfen kısa bir süre sonra tekrar deneyin.',
      ),
  });

  app.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError(401, 'UNAUTHORIZED', 'Oturumunuz geçersiz veya süresi dolmuş.');
    }
  });
}
