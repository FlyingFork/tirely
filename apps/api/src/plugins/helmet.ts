import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';

export const registerHelmet = async (app: FastifyInstance) => {
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });
};
