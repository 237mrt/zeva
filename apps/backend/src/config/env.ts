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

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().max(65_535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: mysqlConnectionUrlSchema,
});

const environmentResult = environmentSchema.safeParse(process.env);

if (!environmentResult.success) {
  const details = environmentResult.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');

  throw new Error(`Geçersiz ortam yapılandırması: ${details}`);
}

export const env = environmentResult.data;
