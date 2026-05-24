import type { FastifyInstance } from 'fastify';

import { auth } from './auth.js';

const SENSITIVE_AUTH_PATHS = new Set([
  '/api/auth/sign-in/email',
  '/api/auth/request-password-reset',
  '/api/auth/forget-password',
  '/api/auth/forgot-password',
]);

export const registerAuth = async (app: FastifyInstance) => {
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    preHandler: async (request, reply) => {
      const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
      if (!SENSITIVE_AUTH_PATHS.has(pathname)) return;

      const authRateLimit = app.rateLimit.bind(app)({
        max: 8,
        timeWindow: '1 minute',
      });
      await authRateLimit.call(app, request, reply);
    },
    handler: async (request, reply) => {
      const url = new URL(request.url, `http://${request.headers.host}`);

      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, String(value));
      });

      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });

      const response = await auth.handler(req);

      reply.status(response.status);
      response.headers.forEach((value, key) => {
        reply.header(key, value);
      });

      const body = await response.text();
      return reply.send(body);
    },
  });
};
