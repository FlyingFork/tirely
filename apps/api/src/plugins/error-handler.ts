import type { ApiError } from '@tirely/types';
import { ERROR_CODES } from '@tirely/types';
import type { FastifyInstance, FastifyError } from 'fastify';

import { reportError } from '../lib/error-reporting.js';

export const registerErrorHandler = async (app: FastifyInstance) => {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const requestId = request.id as string;

    const response: ApiError = {
      code: error.code || ERROR_CODES.INTERNAL_ERROR,
      message: error.message || 'An unexpected error occurred',
      statusCode: error.statusCode || 500,
      requestId,
    };

    if (error.validation) {
      response.code = ERROR_CODES.VALIDATION_ERROR;
      response.statusCode = 400;
      response.details = { validation: error.validation };
    }

    if (response.statusCode >= 500) {
      app.log.error({
        requestId,
        err: error,
        message: 'Internal server error',
      });
      void reportError(app.log, {
        source: 'api',
        severity: 'error',
        message: response.message,
        requestId,
        method: request.method,
        path: request.url,
        stack: error.stack,
        details: { code: response.code, statusCode: response.statusCode },
      });
    } else {
      app.log.warn({
        requestId,
        code: response.code,
        message: response.message,
      });
    }

    reply.status(response.statusCode).send(response);
  });

  app.setNotFoundHandler((request, reply) => {
    const response: ApiError = {
      code: ERROR_CODES.NOT_FOUND,
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
      requestId: request.id as string,
    };

    reply.status(404).send(response);
  });
};
