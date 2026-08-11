import 'dotenv/config';

import { z } from 'zod';

const mysqlConnectionUrlSchema = z.string().min(1, 'DATABASE_URL zorunludur.').refine(
  (value) => {
    try {
      return new URL(value).protocol === 'mysql:';
    } catch {
      return false;
    }
  },
  'DATABASE_URL geçerli bir MySQL bağlantı adresi olmalıdır.',
);

const jwtSecretSchema = z
  .string()
  .min(32, 'JWT_SECRET en az 32 karakter olmalıdır.')
  .refine(
    (value) => new Set(value).size >= 12 && !value.toLowerCase().includes('change-me'),
    'JWT_SECRET tahmin edilmesi zor ve benzersiz bir secret olmalıdır.',
  );

const optionalEnvironmentValue = (schema: z.ZodType<string>) =>
  z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), schema.optional());

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().max(65_535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: mysqlConnectionUrlSchema,
  JWT_SECRET: jwtSecretSchema,
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN örneğin 15m veya 1h olmalıdır.').default('15m'),
  ZEVA_ADMIN_EMAIL: optionalEnvironmentValue(z.string().trim().email().max(191).transform((value) => value.toLowerCase())),
  ZEVA_ADMIN_PASSWORD: optionalEnvironmentValue(z.string().min(12).max(256)),
  ZEVA_ADMIN_NAME: optionalEnvironmentValue(z.string().trim().min(2).max(120)),
});

const environmentResult = environmentSchema.safeParse(process.env);

if (!environmentResult.success) {
  const details = environmentResult.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');

  throw new Error(`Geçersiz ortam yapılandırması: ${details}`);
}

export const env = environmentResult.data;

const adminBootstrapEnvironmentSchema = z.object({
  ZEVA_ADMIN_EMAIL: z.string().trim().email().max(191).transform((value) => value.toLowerCase()),
  ZEVA_ADMIN_PASSWORD: z.string().min(12).max(256),
  ZEVA_ADMIN_NAME: z.string().trim().min(2).max(120),
});

export function getAdminBootstrapEnvironment(): z.infer<typeof adminBootstrapEnvironmentSchema> {
  const result = adminBootstrapEnvironmentSchema.safeParse(env);

  if (!result.success) {
    throw new Error(
      'Yönetici bootstrap işlemi için ZEVA_ADMIN_EMAIL, ZEVA_ADMIN_PASSWORD ve ZEVA_ADMIN_NAME geçerli olmalıdır.',
    );
  }

  return result.data;
}
