import { describe, expect, it } from 'vitest';

import { parseEnvironment } from '../src/config/env.js';
import { loggerConfiguration } from '../src/config/logger.js';

const validEnvironment = {
  NODE_ENV: 'production',
  HOST: '0.0.0.0',
  PORT: '3000',
  LOG_LEVEL: 'info',
  DATABASE_URL: 'mysql://zeva:test@localhost:3306/zeva_test',
  JWT_SECRET: 'valid-production-secret-with-32-plus-unique-characters',
  JWT_EXPIRES_IN: '15m',
};

describe('Auth security configuration', () => {
  it('production ortamında eksik JWT secret değerini reddeder', () => {
    expect(() => parseEnvironment({ ...validEnvironment, JWT_SECRET: undefined })).toThrow(
      'JWT_SECRET',
    );
  });

  it('production ortamında zayıf placeholder JWT secret değerini reddeder', () => {
    expect(() =>
      parseEnvironment({
        ...validEnvironment,
        JWT_SECRET: 'replace-with-at-least-32-random-characters',
      }),
    ).toThrow('JWT_SECRET');
  });

  it('logger yapılandırmasında hassas auth alanlarını maskeler', () => {
    const redactionConfiguration = JSON.stringify(loggerConfiguration.redact);

    expect(redactionConfiguration).toContain('authorization');
    expect(redactionConfiguration).toContain('cookie');
    expect(redactionConfiguration).toContain('password');
    expect(redactionConfiguration).toContain('passwordHash');
    expect(redactionConfiguration).toContain('set-cookie');
  });
});
