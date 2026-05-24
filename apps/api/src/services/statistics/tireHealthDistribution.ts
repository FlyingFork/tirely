import type { ApiPlatformTireHealthDistributionReport } from '@tirely/types';
import { prisma } from '@tirely/database';

import { summarizeTireHealthStatuses } from '../tireHealthBuckets.js';

function selectUsageStatuses(tires: { usageStatus: unknown }[]) {
  return tires.map((tire) => tire.usageStatus);
}

export const platformTireHealthDistribution =
  async (): Promise<ApiPlatformTireHealthDistributionReport> => {
    const tires = await prisma.tire.findMany({
      where: {
        archived: false,
        status: { not: 'DISPOSED' },
      },
      select: { usageStatus: true },
    });

    return { buckets: summarizeTireHealthStatuses(selectUsageStatuses(tires)) };
  };
