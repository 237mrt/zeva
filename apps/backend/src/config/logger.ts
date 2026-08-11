import type { FastifyServerOptions } from 'fastify';

import { env } from './env.js';

type LoggerConfiguration = Exclude<FastifyServerOptions['logger'], boolean | undefined>;

export const loggerConfiguration: LoggerConfiguration = {
  level: env.LOG_LEVEL,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:standard',
          },
        },
      }
    : {}),
};
