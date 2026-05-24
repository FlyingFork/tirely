import { adminStatisticsMonthsQuerySchema } from '@tirely/validators';
import type { FastifyInstance } from 'fastify';

import { getAdminSession } from '../../../auth/auth.js';
import { cached } from '../../../lib/memory-cache.js';
import { sendInternalError, sendValidationError } from '../../../lib/responses.js';
import { catalogGrowth } from '../../../services/statistics/catalogGrowth.js';
import { companiesOverTime } from '../../../services/statistics/companiesOverTime.js';
import { platformKpis } from '../../../services/statistics/kpis.js';
import { requestFunnel } from '../../../services/statistics/requestFunnel.js';
import { platformTireHealthDistribution } from '../../../services/statistics/tireHealthDistribution.js';

export const adminStatisticsRoutes = async (app: FastifyInstance) => {
  const statisticsCacheTtlMs = Number(process.env.STATISTICS_CACHE_TTL_MS ?? 60_000);

  app.get('/kpis', async (request, reply) => {
    const session = await getAdminSession(request, reply);
    if (!session) return;

    try {
      return reply.send({
        data: await cached('statistics:kpis', statisticsCacheTtlMs, platformKpis),
      });
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'Failed to fetch platform KPIs');
      return sendInternalError(reply, request, 'Failed to fetch platform KPIs');
    }
  });

  app.get('/companies-over-time', async (request, reply) => {
    const session = await getAdminSession(request, reply);
    if (!session) return;

    const parsed = adminStatisticsMonthsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendValidationError(reply, request, parsed.error, 'Invalid companies-over-time query');
    }

    try {
      return reply.send({
        data: await cached(
          `statistics:companies-over-time:${parsed.data.months}`,
          statisticsCacheTtlMs,
          () => companiesOverTime(parsed.data.months),
        ),
      });
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'Failed to fetch companies over time');
      return sendInternalError(reply, request, 'Failed to fetch companies over time');
    }
  });

  app.get('/request-funnel', async (request, reply) => {
    const session = await getAdminSession(request, reply);
    if (!session) return;

    try {
      return reply.send({
        data: await cached('statistics:request-funnel', statisticsCacheTtlMs, requestFunnel),
      });
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'Failed to fetch request funnel');
      return sendInternalError(reply, request, 'Failed to fetch request funnel');
    }
  });

  app.get('/catalog-growth', async (request, reply) => {
    const session = await getAdminSession(request, reply);
    if (!session) return;

    const parsed = adminStatisticsMonthsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendValidationError(reply, request, parsed.error, 'Invalid catalog-growth query');
    }

    try {
      return reply.send({
        data: await cached(
          `statistics:catalog-growth:${parsed.data.months}`,
          statisticsCacheTtlMs,
          () => catalogGrowth(parsed.data.months),
        ),
      });
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'Failed to fetch catalog growth');
      return sendInternalError(reply, request, 'Failed to fetch catalog growth');
    }
  });

  app.get('/tire-health-distribution', async (request, reply) => {
    const session = await getAdminSession(request, reply);
    if (!session) return;

    try {
      return reply.send({
        data: await cached(
          'statistics:tire-health-distribution',
          statisticsCacheTtlMs,
          platformTireHealthDistribution,
        ),
      });
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'Failed to fetch tire health distribution');
      return sendInternalError(reply, request, 'Failed to fetch tire health distribution');
    }
  });
};

export const registerAdminStatisticsRoutes = async (app: FastifyInstance) => {
  await app.register(adminStatisticsRoutes, { prefix: '/statistics' });
};
