import type { ApiRequestFunnelReport } from '@tirely/types';
import { prisma } from '@tirely/database';

import { buildMonthKeysBetween, monthKey } from './utils.js';

export const requestFunnel = async (): Promise<ApiRequestFunnelReport> => {
  const [pending, approved, rejected, reviewedRequests] = await Promise.all([
    prisma.companyRequest.count({ where: { status: 'PENDING' } }),
    prisma.companyRequest.count({ where: { status: 'APPROVED' } }),
    prisma.companyRequest.count({ where: { status: 'REJECTED' } }),
    prisma.companyRequest.findMany({
      where: {
        status: { in: ['APPROVED', 'REJECTED'] },
        reviewedAt: { not: null },
      },
      select: {
        status: true,
        reviewedAt: true,
      },
      orderBy: { reviewedAt: 'asc' },
    }),
  ]);

  if (reviewedRequests.length === 0) {
    return {
      totals: { pending, approved, rejected },
      monthly: [],
    };
  }

  const firstReviewedRequest = reviewedRequests[0];
  if (!firstReviewedRequest?.reviewedAt) {
    return {
      totals: { pending, approved, rejected },
      monthly: [],
    };
  }
  const firstReviewedAt = firstReviewedRequest.reviewedAt;

  const monthlyTotals = new Map<string, { approved: number; rejected: number }>();

  for (const request of reviewedRequests) {
    if (!request.reviewedAt) continue;

    const key = monthKey(request.reviewedAt);
    const current = monthlyTotals.get(key) ?? { approved: 0, rejected: 0 };

    if (request.status === 'APPROVED') current.approved += 1;
    if (request.status === 'REJECTED') current.rejected += 1;

    monthlyTotals.set(key, current);
  }

  const monthly = buildMonthKeysBetween(firstReviewedAt, new Date()).map((month) => ({
    month,
    approved: monthlyTotals.get(month)?.approved ?? 0,
    rejected: monthlyTotals.get(month)?.rejected ?? 0,
  }));

  return {
    totals: { pending, approved, rejected },
    monthly,
  };
};
