import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

export const registerCors = async (app: FastifyInstance) => {
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    credentials: true,
  });
};
