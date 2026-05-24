import type { ApiCostSummaryReport } from '@tirely/types';
import { prisma } from '@tirely/database';

function getCostWindowStart(months: number): Date {
  const start = new Date();
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function costMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function addMaintenanceSpend(
  spendByMonth: Map<string, number>,
  event: { date: Date; cost: number | null },
) {
  const period = costMonthKey(event.date);
  const maintenanceSpend = event.cost ?? 0;
  spendByMonth.set(period, (spendByMonth.get(period) ?? 0) + maintenanceSpend);
}

function buildCostRows(months: number, start: Date, spendByMonth: Map<string, number>) {
  return Array.from({ length: months }, (_, index) => {
    const periodStart = new Date(start);
    periodStart.setMonth(start.getMonth() + index);
    const period = costMonthKey(periodStart);
    const total = spendByMonth.get(period) ?? 0;

    return {
      month: period,
      total: Number(total.toFixed(2)),
    };
  });
}

export const costSummary = async (
  companyId: string,
  months: number,
): Promise<ApiCostSummaryReport> => {
  const start = getCostWindowStart(months);

  const events = await prisma.maintenanceEvent.findMany({
    where: {
      companyId,
      date: { gte: start },
      cost: { not: null },
    },
    select: {
      date: true,
      cost: true,
    },
    orderBy: { date: 'asc' },
  });

  const maintenanceSpendByMonth = new Map<string, number>();
  events.forEach((event) => addMaintenanceSpend(maintenanceSpendByMonth, event));

  return { months: buildCostRows(months, start, maintenanceSpendByMonth) };
};
