import type { ApiPlatformKpis } from '@tirely/types';
import { prisma } from '@tirely/database';

import { startOfMonth } from './utils.js';

export const platformKpis = async (): Promise<ApiPlatformKpis> => {
  const monthStart = startOfMonth(new Date());

  const [
    activeCompanies,
    activeUsers,
    vehicles,
    tires,
    inspectionsThisMonth,
    maintenanceThisMonth,
  ] = await Promise.all([
    prisma.company.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { banned: false } }),
    prisma.vehicle.count({ where: { archived: false } }),
    prisma.tire.count({
      where: {
        archived: false,
        status: { not: 'DISPOSED' },
      },
    }),
    prisma.inspection.count({
      where: {
        date: { gte: monthStart },
      },
    }),
    prisma.maintenanceEvent.count({
      where: {
        date: { gte: monthStart },
      },
    }),
  ]);

  return {
    activeCompanies,
    activeUsers,
    vehicles,
    tires,
    inspectionsThisMonth,
    maintenanceThisMonth,
  };
};
