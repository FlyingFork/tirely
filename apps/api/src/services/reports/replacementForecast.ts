import type { ApiReplacementForecastReport } from '@tirely/types';
import { prisma } from '@tirely/database';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const FORECAST_THRESHOLD = 95;

export const replacementForecast = async (
  companyId: string,
): Promise<ApiReplacementForecastReport> => {
  const tires = await prisma.tire.findMany({
    where: {
      companyId,
      status: 'MOUNTED',
      archived: false,
      usagePercentage: { not: null },
      currentLifecycleStartDate: { not: null },
    },
    select: {
      usagePercentage: true,
      currentLifecycleStartDate: true,
    },
  });

  const counts: ApiReplacementForecastReport = {
    trackedTires: 0,
    next30: 0,
    next60: 0,
    next90: 0,
  };

  const now = Date.now();

  for (const tire of tires) {
    const usage = tire.usagePercentage;
    const lifecycleStart = tire.currentLifecycleStartDate;

    if (usage === null || !lifecycleStart || usage <= 0 || usage >= FORECAST_THRESHOLD) {
      continue;
    }

    counts.trackedTires += 1;

    const ageMs = now - lifecycleStart.getTime();
    const projectedMs = ageMs * ((FORECAST_THRESHOLD - usage) / usage);
    const projectedDays = projectedMs / MS_PER_DAY;

    if (projectedDays <= 30) counts.next30 += 1;
    if (projectedDays <= 60) counts.next60 += 1;
    if (projectedDays <= 90) counts.next90 += 1;
  }

  return counts;
};
