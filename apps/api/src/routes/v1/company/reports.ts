import type { FastifyInstance } from 'fastify';
import { costSummaryQuerySchema } from '@tirely/validators';

import { requireFleetManager } from '../../../auth/auth.js';
import { cached } from '../../../lib/memory-cache.js';
import { sendInternalError, sendValidationError } from '../../../lib/responses.js';
import { brandBenchmarking } from '../../../services/reports/brandBenchmarking.js';
import { costSummary } from '../../../services/reports/costSummary.js';
import { inspectionCompliance } from '../../../services/reports/inspectionCompliance.js';
import { replacementForecast } from '../../../services/reports/replacementForecast.js';
import { tireHealthDistribution } from '../../../services/reports/tireHealthDistribution.js';

export const reportRoutes = async (app: FastifyInstance) => {
  const reportCacheTtlMs = Number(process.env.REPORT_CACHE_TTL_MS ?? 60_000);

  app.get('/:slug/reports/tire-health-distribution', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const access = await requireFleetManager(request, reply, slug);
    if (!access) return;

    try {
      return reply.send({
        data: await cached(
          `reports:${access.company.id}:tire-health-distribution`,
          reportCacheTtlMs,
          () => tireHealthDistribution(access.company.id),
        ),
      });
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'Failed to fetch tire health distribution');
      return sendInternalError(reply, request, 'Failed to fetch tire health distribution');
    }
  });

  app.get('/:slug/reports/replacement-forecast', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const access = await requireFleetManager(request, reply, slug);
    if (!access) return;

    try {
      return reply.send({
        data: await cached(
          `reports:${access.company.id}:replacement-forecast`,
          reportCacheTtlMs,
          () => replacementForecast(access.company.id),
        ),
      });
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'Failed to fetch replacement forecast');
      return sendInternalError(reply, request, 'Failed to fetch replacement forecast');
    }
  });

  app.get('/:slug/reports/inspection-compliance', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const access = await requireFleetManager(request, reply, slug);
    if (!access) return;

    try {
      return reply.send({
        data: await cached(
          `reports:${access.company.id}:inspection-compliance`,
          reportCacheTtlMs,
          () => inspectionCompliance(access.company.id),
        ),
      });
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'Failed to fetch inspection compliance');
      return sendInternalError(reply, request, 'Failed to fetch inspection compliance');
    }
  });

  app.get('/:slug/reports/brand-benchmarking', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const access = await requireFleetManager(request, reply, slug);
    if (!access) return;

    try {
      return reply.send({
        data: await cached(
          `reports:${access.company.id}:brand-benchmarking`,
          reportCacheTtlMs,
          () => brandBenchmarking(access.company.id),
        ),
      });
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'Failed to fetch brand benchmarking');
      return sendInternalError(reply, request, 'Failed to fetch brand benchmarking');
    }
  });

  app.get('/:slug/reports/cost-summary', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const access = await requireFleetManager(request, reply, slug);
    if (!access) return;

    const parsed = costSummaryQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendValidationError(reply, request, parsed.error, 'Invalid cost summary query');
    }

    try {
      return reply.send({
        data: await cached(
          `reports:${access.company.id}:cost-summary:${parsed.data.months}`,
          reportCacheTtlMs,
          () => costSummary(access.company.id, parsed.data.months),
        ),
      });
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'Failed to fetch cost summary');
      return sendInternalError(reply, request, 'Failed to fetch cost summary');
    }
  });
};
