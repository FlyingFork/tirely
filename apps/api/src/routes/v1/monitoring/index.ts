import type { FastifyInstance } from 'fastify';
import { clientErrorReportSchema } from '@tirely/validators';

import { reportError } from '../../../lib/error-reporting.js';
import { sendValidationError } from '../../../lib/responses.js';

export const registerMonitoringRoutes = async (app: FastifyInstance) => {
  app.post('/client-error', async (request, reply) => {
    const parsed = clientErrorReportSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, request, parsed.error, 'Invalid client error report');
    }

    await reportError(app.log, {
      source: 'web',
      severity: 'error',
      message: parsed.data.message,
      requestId: request.id,
      path: parsed.data.path,
      stack: parsed.data.stack,
      digest: parsed.data.digest,
      userAgent: parsed.data.userAgent,
    });

    reply.status(202);
    return reply.send({ data: { ok: true } });
  });
};
