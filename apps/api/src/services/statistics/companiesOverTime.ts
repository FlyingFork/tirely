import type { ApiCompaniesOverTimeReport } from '@tirely/types';
import { prisma } from '@tirely/database';

import { buildMonthlyCountRows, countDatesByMonth, getMonthWindowStart } from './utils.js';

function buildCumulativeCompanyRows(
  monthlyAdditions: { month: string; count: number }[],
  existingCompaniesBeforeWindow: number,
) {
  let cumulativeCompanies = existingCompaniesBeforeWindow;

  return monthlyAdditions.map(({ month, count: createdCompanies }) => {
    cumulativeCompanies += createdCompanies;
    return { month, count: cumulativeCompanies };
  });
}

export const companiesOverTime = async (months: number): Promise<ApiCompaniesOverTimeReport> => {
  const start = getMonthWindowStart(months);

  const [existingBeforeWindow, companiesCreatedInWindow] = await Promise.all([
    prisma.company.count({
      where: {
        createdAt: { lt: start },
      },
    }),
    prisma.company.findMany({
      where: {
        createdAt: { gte: start },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const createdDates = companiesCreatedInWindow.map((company) => company.createdAt);
  const additionsByMonth = countDatesByMonth(createdDates);
  const monthlyAdditions = buildMonthlyCountRows(months, start, additionsByMonth);

  return { months: buildCumulativeCompanyRows(monthlyAdditions, existingBeforeWindow) };
};
