import type { ApiCatalogGrowthReport } from '@tirely/types';
import { prisma } from '@tirely/database';

import { buildMonthlyCountRows, countDatesByMonth, getMonthWindowStart } from './utils.js';

function toCatalogMonthlyRows(monthlyCounts: { month: string; count: number }[]) {
  return monthlyCounts.map(({ month, count: approvedModels }) => ({
    month,
    approvedModels,
  }));
}

export const catalogGrowth = async (months: number): Promise<ApiCatalogGrowthReport> => {
  const start = getMonthWindowStart(months);

  const [brands, approvedModels, pendingModels, approvedModelsInWindow] = await Promise.all([
    prisma.catalogBrand.count(),
    prisma.catalogModel.count({ where: { status: 'APPROVED' } }),
    prisma.catalogModel.count({ where: { status: 'PENDING' } }),
    prisma.catalogModel.findMany({
      where: {
        status: 'APPROVED',
        createdAt: { gte: start },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const approvalDates = approvedModelsInWindow.map((model) => model.createdAt);
  const approvedModelsByMonth = countDatesByMonth(approvalDates);
  const monthlyCounts = buildMonthlyCountRows(months, start, approvedModelsByMonth);

  return {
    totals: {
      brands,
      approvedModels,
      pendingModels,
    },
    monthly: toCatalogMonthlyRows(monthlyCounts),
  };
};
