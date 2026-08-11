import { z } from 'zod';

const environmentSchema = z.object({
  VITE_API_URL: z.string().trim().min(1).default('/api/v1'),
});

const environmentResult = environmentSchema.safeParse(import.meta.env);

if (!environmentResult.success) {
  throw new Error('Frontend ortam yapılandırması geçersiz.');
}

export const env = environmentResult.data;
