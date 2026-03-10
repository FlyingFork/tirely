import Fastify from 'fastify';

import { registerAuth } from './auth/plugin.js';
import { registerCors } from './plugins/cors.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerHelmet } from './plugins/helmet.js';
import { registerRateLimit } from './plugins/rate-limit.js';
import { registerRequestId } from './plugins/request-id.js';
import { registerSwagger } from './plugins/swagger.js';
import { healthRoutes } from './routes/v1/health.js';

export const buildApp = async () => {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Error Handler
  await registerErrorHandler(app);

  // Plugins
  await registerRequestId(app);
  await registerCors(app);
  await registerHelmet(app);
  await registerRateLimit(app);
  await registerSwagger(app);

  // Auth
  await registerAuth(app);

  // Routes
  await app.register(healthRoutes, { prefix: '/v1' });

  return app;
};
