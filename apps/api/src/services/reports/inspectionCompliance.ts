import type { ApiInspectionComplianceReport } from '@tirely/types';
import { prisma } from '@tirely/database';

const DEFAULT_STALE_INSPECTION_DAYS = 90;
const MAX_OVERDUE_IDS = 100;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const inspectionCompliance = async (
  companyId: string,
): Promise<ApiInspectionComplianceReport> => {
  const settings = await prisma.companySettings.findUnique({
    where: { companyId },
    select: { staleInspectionThresholdDays: true },
  });

  const cutoff = new Date(
    Date.now() -
      (settings?.staleInspectionThresholdDays ?? DEFAULT_STALE_INSPECTION_DAYS) * MS_PER_DAY,
  );

  const activeVehicleWhere = { companyId, archived: false } as const;

  const [totalVehicles, compliantVehicles] = await Promise.all([
    prisma.vehicle.count({ where: activeVehicleWhere }),
    prisma.vehicle.count({
      where: {
        ...activeVehicleWhere,
        inspections: {
          some: {
            type: 'DETAILED',
            date: { gte: cutoff },
          },
        },
      },
    }),
  ]);

  const overdueVehicleIds =
    totalVehicles === compliantVehicles
      ? []
      : await prisma.vehicle
          .findMany({
            where: {
              ...activeVehicleWhere,
              NOT: {
                inspections: {
                  some: {
                    type: 'DETAILED',
                    date: { gte: cutoff },
                  },
                },
              },
            },
            select: { id: true },
            orderBy: { createdAt: 'asc' },
            take: MAX_OVERDUE_IDS,
          })
          .then((rows) => rows.map((row) => row.id));

  return {
    totalVehicles,
    compliantVehicles,
    compliancePct: totalVehicles > 0 ? compliantVehicles / totalVehicles : 0,
    overdueVehicleIds,
  };
};
