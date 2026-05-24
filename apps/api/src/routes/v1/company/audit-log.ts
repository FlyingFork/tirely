import { USER_ROLES } from '@tirely/types';
import { auditLogListQuerySchema } from '@tirely/validators';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import { getSession } from '../../../auth/auth.js';
import {
  sendForbidden,
  sendInternalError,
  sendNotFound,
  sendValidationError,
} from '../../../lib/responses.js';
import { listAuditLogs } from '../../../repositories/audit-log.repository.js';
import { findCompanyBySlugForAccessCheck } from '../../../repositories/company.repository.js';


function parseCompanyAuditQuery(request: FastifyRequest) {
  return auditLogListQuerySchema.safeParse(request.query);
}



function canReadCompanyAuditLogs(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  company: NonNullable<Awaited<ReturnType<typeof findCompanyBySlugForAccessCheck>>>,
) {
  const isAdmin = session.user.role === USER_ROLES.ADMIN;
  const isFleetManagerMember =
    session.user.role === USER_ROLES.FLEET_MANAGER &&
    company.users.some((user) => user.id === session.user.id);

  return isAdmin || isFleetManagerMember;
}


function auditLogPage(page: number, perPage: number) {
  return {
    skip: (page - 1) * perPage,
    meta: { page, perPage },
  };
}


export const companyAuditLogRoutes = async (app: FastifyInstance) => {
  app.get('/:slug/audit-logs', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);
      if (!session) {
        return;
      }

      const { slug } = request.params as { slug: string };

      const company = await findCompanyBySlugForAccessCheck(slug);

      if (!company) {
        return sendNotFound(reply, request, 'Company not found');
      }

      if (!canReadCompanyAuditLogs(session, company)) {
        return sendForbidden(reply, request, 'You do not have access to these audit logs');
      }

      const queryResult = parseCompanyAuditQuery(request);
      if (!queryResult.success) {
        return sendValidationError(reply, request, queryResult.error, 'Invalid query parameters');
      }

      const { page, perPage, action, entityType, search, sortOrder } = queryResult.data;
      const pageData = auditLogPage(page, perPage);

      try {
        const { logs, total } = await listAuditLogs({
          skip: pageData.skip,
          take: perPage,
          scope: { companyId: company.id },
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
        app.log.error({ err, requestId: request.id }, 'Failed to list company audit logs');
        return sendInternalError(reply, request, 'Failed to list company audit logs');
      }
    },
  });
};
