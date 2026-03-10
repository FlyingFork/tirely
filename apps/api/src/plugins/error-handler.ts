import type { FastifyInstance, FastifyError } from 'fastify';

interface ErrorResponse {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  requestId?: string;
}

export const registerErrorHandler = async (app: FastifyInstance) => {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const requestId = request.id as string;

    const response: ErrorResponse = {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
      statusCode: error.statusCode || 500,
      requestId,
    };

    if (error.validation) {
      response.code = 'VALIDATION_ERROR';
      response.statusCode = 400;
      response.details = { validation: error.validation };
    }

    if (response.statusCode >= 500) {
      app.log.error({
        requestId,
        err: error,
        message: 'Internal server error',
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
    reply.status(404).send({
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
      requestId: request.id,
    });
  });
};
