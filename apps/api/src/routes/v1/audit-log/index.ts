import { auditLogListQuerySchema } from '@tirely/validators';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import { getAdminSession } from '../../../auth/auth.js';
import { sendInternalError, sendValidationError } from '../../../lib/responses.js';
import { listAuditLogs } from '../../../repositories/audit-log.repository.js';


function parseAuditQuery(request: FastifyRequest) {
  return auditLogListQuerySchema.safeParse(request.query);
}



function auditPagination(page: number, perPage: number) {
  return {
    skip: (page - 1) * perPage,
    meta: { page, perPage },
  };
}


export const auditLogRoutes = async (app: FastifyInstance) => {
  app.get('/audit-logs', {
    handler: async (request, reply) => {
      const session = await getAdminSession(request, reply);
      if (!session) {
        return;
      }

      const queryResult = parseAuditQuery(request);
      if (!queryResult.success) {
        return sendValidationError(reply, request, queryResult.error, 'Invalid query parameters');
      }

      const { page, perPage, action, entityType, search, sortOrder } = queryResult.data;
      const pageData = auditPagination(page, perPage);

      try {
        const { logs, total } = await listAuditLogs({
          skip: pageData.skip,
          take: perPage,
          scope: 'admin',
          action,
          entityType,
          search,
          sortOrder,
        });

        return reply.send({
          data: logs,
          meta: { ...pageData.meta, total },
        });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to list audit logs');
        return sendInternalError(reply, request, 'Failed to list audit logs');
      }
    },
  });
};

export const registerAuditLogRoutes = async (app: FastifyInstance) => {
  await app.register(auditLogRoutes, { prefix: '/v1' });
};
