import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      reporter: ['text', 'html'],
    },
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: 'mysql://zeva:test@localhost:3306/zeva_test',
      JWT_SECRET: 'zeva-test-secret-with-more-than-32-unique-characters',
      JWT_EXPIRES_IN: '15m',
    },
  },
});
