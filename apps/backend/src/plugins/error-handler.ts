import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { AppError } from '../shared/errors/app-error.js';
import { errorResponse } from '../shared/http/api-response.js';

function isValidationError(error: unknown): error is { validation: unknown } {
  return typeof error === 'object' && error !== null && 'validation' in error;
}

export function registerErrorHandlers(app: FastifyInstance): void {
  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send(errorResponse('NOT_FOUND', 'İstenen kaynak bulunamadı.'));
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(errorResponse(error.code, error.message));
    }

    if (error instanceof ZodError || isValidationError(error)) {
      return reply.status(400).send(errorResponse('VALIDATION_ERROR', 'Gönderilen bilgiler geçersiz.'));
    }

    request.log.error({ err: error }, 'İstek işlenirken beklenmeyen bir hata oluştu.');

    return reply
      .status(500)
      .send(errorResponse('INTERNAL_SERVER_ERROR', 'Beklenmeyen bir hata oluştu.'));
  });
}
