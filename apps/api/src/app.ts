import Fastify from 'fastify';

import { setAuthLogger } from './auth/auth.js';
import { registerAuth } from './auth/plugin.js';
import { getEmailService } from './lib/email/index.js';
import { registerCors } from './plugins/cors.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerHelmet } from './plugins/helmet.js';
import { registerRateLimit } from './plugins/rate-limit.js';
import { registerRequestId } from './plugins/request-id.js';
import { registerSwagger } from './plugins/swagger.js';
import { registerAuditLogRoutes } from './routes/v1/audit-log/index.js';
import { registerAdminRoutes } from './routes/v1/admin/index.js';
import { registerCatalogRoutes } from './routes/v1/catalog/index.js';
import { registerCompanyRoutes } from './routes/v1/company/index.js';
import { healthRoutes } from './routes/v1/health.js';
import { registerMeRoutes } from './routes/v1/me/index.js';
import { registerMonitoringRoutes } from './routes/v1/monitoring/index.js';
import { registerScheduler } from './scheduler/index.js';

export const buildApp = async () => {
  const app = Fastify({
    logger:
      process.env.NODE_ENV === 'production'
        ? true
        : {
            transport: {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            },
          },
  });

  setAuthLogger(app.log);
  app.decorate('email', getEmailService());

  await registerErrorHandler(app);

  await registerRequestId(app);
  await registerCors(app);
  await registerHelmet(app);
  await registerRateLimit(app);
  await registerSwagger(app);

  await registerAuth(app);

  await app.register(healthRoutes, { prefix: '/v1' });

  await registerCompanyRoutes(app);
  await registerAuditLogRoutes(app);
  await registerAdminRoutes(app);
  await registerMeRoutes(app);
  await app.register(registerMonitoringRoutes, { prefix: '/v1/monitoring' });
  await registerCatalogRoutes(app);
  await registerScheduler(app);

  return app;
};
