import { FastifyInstance } from 'fastify';

import { companyAuditLogRoutes } from './audit-log.js';
import { companyRoutes } from './company.js';
import { depotRoutes } from './depots.js';
import { companyRequestRoutes } from './request.js';
import { companySettingsRoutes } from './settings.js';
import { companyUserRoutes } from './users.js';
import { vehicleRoutes } from './vehicles.js';
import { mileageRoutes } from './mileage.js';
import { tireRoutes } from './tires.js';
import { tireSetRoutes } from './tire-sets.js';
import { mountingRoutes } from './mounting.js';
import { inspectionRoutes } from './inspections.js';
import { maintenanceRoutes } from './maintenance.js';
import { reportRoutes } from './reports.js';

export const registerCompanyRoutes = async (app: FastifyInstance) => {
  await app.register(companyRequestRoutes, { prefix: '/v1/company' });
  await app.register(companyAuditLogRoutes, { prefix: '/v1/company' });
  await app.register(companySettingsRoutes, { prefix: '/v1/company' });
  await app.register(companyUserRoutes, { prefix: '/v1/company' });
  await app.register(depotRoutes, { prefix: '/v1/company' });
  await app.register(vehicleRoutes, { prefix: '/v1/company' });
  await app.register(mileageRoutes, { prefix: '/v1/company' });
  await app.register(tireRoutes, { prefix: '/v1/company' });
  await app.register(tireSetRoutes, { prefix: '/v1/company' });
  await app.register(mountingRoutes, { prefix: '/v1/company' });
  await app.register(inspectionRoutes, { prefix: '/v1/company' });
  await app.register(maintenanceRoutes, { prefix: '/v1/company' });
  await app.register(reportRoutes, { prefix: '/v1/company' });
  await app.register(companyRoutes, { prefix: '/v1/company' });
};
