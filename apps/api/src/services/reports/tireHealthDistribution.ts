import type { ApiTireHealthDistributionReport } from '@tirely/types';
import { prisma } from '@tirely/database';

import { summarizeTireHealthStatuses } from '../tireHealthBuckets.js';

function buildCompanyTireHealthReport(tires: { usageStatus: unknown }[]) {
  const statuses = tires.map((tire) => tire.usageStatus);
  return { buckets: summarizeTireHealthStatuses(statuses) };
}

export const tireHealthDistribution = async (
  companyId: string,
): Promise<ApiTireHealthDistributionReport> => {
  const tires = await prisma.tire.findMany({
    where: {
      companyId,
      archived: false,
      status: { not: 'DISPOSED' },
    },
    select: { usageStatus: true },
  });

  return buildCompanyTireHealthReport(tires);
};
