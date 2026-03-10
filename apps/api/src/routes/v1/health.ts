import { prisma } from '@tirely/database';
import type { FastifyInstance } from 'fastify';

export const healthRoutes = async (app: FastifyInstance) => {
  app.get('/health', {
    schema: {
      description: 'Health check endpoint',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            database: { type: 'string' },
            uptime: { type: 'number' },
          },
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            database: { type: 'string' },
            error: { type: 'string' },
            uptime: { type: 'number' },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      const timestamp = new Date().toISOString();
      const uptime = process.uptime();

      try {
        await prisma.$queryRaw`SELECT 1`;

        return {
          status: 'Healthy',
          timestamp,
          database: 'connected',
          uptime,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown database error';

        return reply.status(503).send({
          status: 'Unhealthy',
          timestamp,
          database: 'disconnected',
          error: message,
          uptime,
        });
      }
    },
  });
};
