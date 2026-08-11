import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email().max(191).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(256),
});

export const authUserResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'email', 'name', 'role'],
  properties: {
    id: { type: 'string' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    role: { type: 'string', enum: ['ADMIN'] },
  },
} as const;

export const errorResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['success', 'error'],
  properties: {
    success: { type: 'boolean', const: false },
    error: {
      type: 'object',
      additionalProperties: false,
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;
