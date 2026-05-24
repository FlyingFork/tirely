import type { ApiBrandBenchmarkingReport } from '@tirely/types';
import { prisma } from '@tirely/database';

interface BenchmarkAccumulator {
  brand: string;
  model: string;
  mileages: number[];
  vsExpected: number[];
}

export const brandBenchmarking = async (companyId: string): Promise<ApiBrandBenchmarkingReport> => {
  const disposedTires = await prisma.tire.findMany({
    where: {
      companyId,
      status: 'DISPOSED',
    },
    select: {
      brand: true,
      model: true,
      accumulatedMileage: true,
      expectedMileageLifespan: true,
    },
  });

  const grouped = new Map<string, BenchmarkAccumulator>();

  for (const tire of disposedTires) {
    const key = `${tire.brand}::${tire.model}`;
    const entry = grouped.get(key) ?? {
      brand: tire.brand,
      model: tire.model,
      mileages: [],
      vsExpected: [],
    };

    entry.mileages.push(tire.accumulatedMileage);
    if (tire.expectedMileageLifespan && tire.expectedMileageLifespan > 0) {
      entry.vsExpected.push(tire.accumulatedMileage / tire.expectedMileageLifespan);
    }

    grouped.set(key, entry);
  }

  const rows = Array.from(grouped.values())
    .map((entry) => ({
      brand: entry.brand,
      model: entry.model,
      avgLifespanKm: Math.round(
        entry.mileages.reduce((sum, value) => sum + value, 0) / entry.mileages.length,
      ),
      avgVsExpectedPct:
        entry.vsExpected.length > 0
          ? Math.round(
              (entry.vsExpected.reduce((sum, value) => sum + value, 0) / entry.vsExpected.length) *
                100,
            )
          : null,
      samples: entry.mileages.length,
    }))
    .sort((left, right) => right.avgLifespanKm - left.avgLifespanKm);

  return { rows };
};
