import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import type { AuthUserRecord } from '../src/modules/auth/auth.types.js';
import { hashPassword } from '../src/modules/auth/password.js';
import type { ErrorResponse, SuccessResponse } from '../src/shared/http/api-response.js';
import { InMemoryAuthRepository } from './helpers/in-memory-auth-repository.js';

interface LoginData {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN';
  };
}

interface MeData {
  user: LoginData['user'];
}

describe('Authentication integration', () => {
  let app: FastifyInstance;
  let repository: InMemoryAuthRepository;
  let users: AuthUserRecord[];

  beforeAll(async () => {
    const passwordHash = await hashPassword('ValidPassword123!');
    users = [
      {
        id: 'active-admin',
        email: 'admin@zeva.test',
        passwordHash,
        name: 'Aktif Yönetici',
        role: 'ADMIN',
        isActive: true,
      },
      {
        id: 'inactive-admin',
        email: 'inactive@zeva.test',
        passwordHash,
        name: 'Pasif Yönetici',
        role: 'ADMIN',
        isActive: false,
      },
    ];
  });

  beforeEach(async () => {
    repository = new InMemoryAuthRepository(users);
    app = await buildApp({
      logger: false,
      documentation: false,
      authService: new AuthService(repository),
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  async function login(email = 'admin@zeva.test', password = 'ValidPassword123!') {
    return app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    });
  }

  it('login tokenı yalnızca cookie ile taşır ve cookie ile mevcut kullanıcıyı döndürür', async () => {
    const response = await login();
    const body = response.json<SuccessResponse<LoginData>>();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      success: true,
      data: {
        user: {
          id: 'active-admin',
          email: 'admin@zeva.test',
          name: 'Aktif Yönetici',
          role: 'ADMIN',
        },
      },
    });
    expect(body.data).not.toHaveProperty('accessToken');

    const setCookieHeader = response.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain('HttpOnly');
    expect(setCookieHeader).toContain('SameSite=Strict');

    const cookie = (Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader)?.split(
      ';',
    )[0];
    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: cookie ?? '' },
    });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json<SuccessResponse<MeData>>().data.user.id).toBe('active-admin');
  });

  it('yanlış email için genel kimlik bilgisi hatası döndürür', async () => {
    const response = await login('unknown@zeva.test');

    expect(response.statusCode).toBe(401);
    expect(response.json<ErrorResponse>()).toEqual({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'E-posta veya şifre hatalı.',
      },
    });
  });

  it('yanlış şifre için email ile aynı genel hatayı döndürür', async () => {
    const response = await login('admin@zeva.test', 'WrongPassword123!');

    expect(response.statusCode).toBe(401);
    expect(response.json<ErrorResponse>().error.code).toBe('INVALID_CREDENTIALS');
  });

  it('inactive kullanıcı için hesap devre dışı hatası döndürür', async () => {
    const response = await login('inactive@zeva.test');

    expect(response.statusCode).toBe(403);
    expect(response.json<ErrorResponse>().error.code).toBe('ACCOUNT_DISABLED');
  });

  it('Bearer header ile mevcut kullanıcı isteğini reddeder', async () => {
    const loginResponse = await login();
    const setCookieHeader = loginResponse.headers['set-cookie'];
    const cookie = (Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader)?.split(
      ';',
    )[0];
    const sessionToken = cookie?.split('=')[1] ?? '';
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${sessionToken}` },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json<ErrorResponse>().error.code).toBe('UNAUTHORIZED');
  });

  it('login sonrası pasifleşen kullanıcıyı mevcut cookie ile reddeder', async () => {
    const loginResponse = await login();
    const setCookieHeader = loginResponse.headers['set-cookie'];
    const cookie = (Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader)?.split(
      ';',
    )[0];
    const sessionUser = await repository.findById('active-admin');

    if (!sessionUser) {
      throw new Error('Test user not found');
    }

    sessionUser.isActive = false;

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: cookie ?? '' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json<ErrorResponse>().error.code).toBe('ACCOUNT_DISABLED');
  });

  it('logout işleminde HttpOnly oturum cookie’sini temizler', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<SuccessResponse<Record<string, never>>>()).toEqual({
      success: true,
      data: {},
    });
    expect(response.headers['set-cookie']).toContain('zeva_access_token=;');
    expect(response.headers['set-cookie']).toContain('HttpOnly');
    expect(response.headers['set-cookie']).toContain('SameSite=Strict');
  });

  it('token olmadan mevcut kullanıcı isteğini reddeder', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });

    expect(response.statusCode).toBe(401);
    expect(response.json<ErrorResponse>().error.code).toBe('UNAUTHORIZED');
  });

  it('geçersiz cookie ile mevcut kullanıcı isteğini reddeder', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: 'zeva_access_token=invalid-token' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json<ErrorResponse>().error.code).toBe('UNAUTHORIZED');
  });

  it('auth response içinde passwordHash döndürmez', async () => {
    const response = await login();

    expect(JSON.stringify(response.json())).not.toContain('passwordHash');
  });

  it('login denemelerini standart hata cevabıyla sınırlar', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login('unknown@zeva.test');
    }

    const response = await login('unknown@zeva.test');

    expect(response.statusCode).toBe(429);
    expect(response.json<ErrorResponse>().error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
