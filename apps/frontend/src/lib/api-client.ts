import { z } from 'zod';

import { env } from '../config/env';

const apiResponseSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: z.unknown(),
  }),
  z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  }),
]);

export class ApiError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function invalidApiResponse(statusCode: number): ApiError {
  return new ApiError(
    'INVALID_API_RESPONSE',
    'Sunucudan geçersiz bir cevap alındı.',
    statusCode,
  );
}

class ApiClient {
  private readonly baseUrl = env.VITE_API_URL.replace(/\/$/, '');

  public async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const headers = new Headers(options.headers);

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    if (typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${this.baseUrl}${normalizedPath}`, {
      ...options,
      headers,
      credentials: options.credentials ?? 'include',
    });

    let responseBody: unknown;

    try {
      responseBody = await response.json();
    } catch {
      throw invalidApiResponse(response.status);
    }

    const result = apiResponseSchema.safeParse(responseBody);

    if (!result.success) {
      throw invalidApiResponse(response.status);
    }

    if (!response.ok || !result.data.success) {
      const error = result.data.success
        ? { code: 'REQUEST_FAILED', message: 'İşlem tamamlanamadı.' }
        : result.data.error;

      throw new ApiError(error.code, error.message, response.status);
    }

    return result.data.data as T;
  }
}

export const apiClient = new ApiClient();
