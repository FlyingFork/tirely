import { randomUUID } from 'node:crypto';

import type { FastifyInstance } from 'fastify';

export const registerRequestId = async (app: FastifyInstance) => {
  app.addHook('onRequest', async (request, reply) => {
    const requestId = (request.headers['x-request-id'] as string) || randomUUID();
    request.id = requestId;
    reply.header('x-request-id', requestId);
  });
};
