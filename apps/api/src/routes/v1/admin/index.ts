import type { FastifyInstance } from 'fastify';

import { registerAdminCatalogRoutes } from './catalog/index.js';
import { registerAdminCompanyInfoRoutes } from './company-info.js';
import { registerAdminStatisticsRoutes } from './statistics.js';

export const registerAdminRoutes = async (app: FastifyInstance) => {
  await app.register(registerAdminCatalogRoutes, { prefix: '/v1/admin' });
  await app.register(registerAdminStatisticsRoutes, { prefix: '/v1/admin' });
  await app.register(registerAdminCompanyInfoRoutes, { prefix: '/v1/admin' });
};
