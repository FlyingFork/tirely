import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { auth } from './auth.js';

export const getSession = async (request: FastifyRequest) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
  return session;
};

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  const session = await getSession(request);
  if (!session) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  return session;
};
