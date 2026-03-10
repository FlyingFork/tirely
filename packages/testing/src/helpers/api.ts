import type { FastifyInstance, InjectOptions } from 'fastify';
import type { InjectPayload } from 'light-my-request';

export const createTestRequest = (app: FastifyInstance) => {
  return {
    get: (url: string, opts?: Partial<InjectOptions>) =>
      app.inject({ method: 'GET', url, ...opts }),

    post: (url: string, body?: InjectPayload, opts?: Partial<InjectOptions>) =>
      app.inject({ method: 'POST', url, payload: body, ...opts }),

    put: (url: string, body?: InjectPayload, opts?: Partial<InjectOptions>) =>
      app.inject({ method: 'PUT', url, payload: body, ...opts }),

    patch: (url: string, body?: InjectPayload, opts?: Partial<InjectOptions>) =>
      app.inject({ method: 'PATCH', url, payload: body, ...opts }),

    delete: (url: string, opts?: Partial<InjectOptions>) =>
      app.inject({ method: 'DELETE', url, ...opts }),
  };
};
