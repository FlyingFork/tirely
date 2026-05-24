import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

import { getCorsOrigin } from '../lib/origins.js';

export const registerCors = async (app: FastifyInstance) => {
  await app.register(cors, {
    origin: getCorsOrigin(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    credentials: true,
  });
};
