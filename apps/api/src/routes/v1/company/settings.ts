import { USER_ROLES } from '@tirely/types';
import { companySettingsUpdateSchema } from '@tirely/validators';
import { FastifyInstance } from 'fastify';

import { getSession } from '../../../auth/auth.js';
import {
  sendForbidden,
  sendInternalError,
  sendNotFound,
  sendValidationError,
} from '../../../lib/responses.js';
import { createAuditLog } from '../../../repositories/audit-log.repository.js';
import {
  getOrCreateCompanySettings,
  updateCompanySettings,
} from '../../../repositories/company-settings.repository.js';
import { findCompanyBySlugForAccessCheck } from '../../../repositories/company.repository.js';
import { recalculateUsageForCompany } from '../../../services/usage-algorithm/recalculate.js';

export const companySettingsRoutes = async (app: FastifyInstance) => {
  app.get('/:slug/settings', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);
      if (!session) return;

      const { slug } = request.params as { slug: string };

      const company = await findCompanyBySlugForAccessCheck(slug);
      if (!company) return sendNotFound(reply, request, 'Company not found');

      const isAdmin = session.user.role === USER_ROLES.ADMIN;
      const isFleetManagerMember =
        session.user.role === USER_ROLES.FLEET_MANAGER &&
        company.users.some((u) => u.id === session.user.id);

      if (!isAdmin && !isFleetManagerMember) {
        return sendForbidden(reply, request, 'You do not have access to these settings');
      }

      try {
        const settings = await getOrCreateCompanySettings(company.id);
        return reply.send({ data: settings });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to fetch company settings');
        return sendInternalError(reply, request, 'Failed to fetch company settings');
      }
    },
  });

  app.patch('/:slug/settings', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);
      if (!session) return;

      const { slug } = request.params as { slug: string };

      const company = await findCompanyBySlugForAccessCheck(slug);
      if (!company) return sendNotFound(reply, request, 'Company not found');

      const isAdmin = session.user.role === USER_ROLES.ADMIN;
      const isFleetManagerMember =
        session.user.role === USER_ROLES.FLEET_MANAGER &&
        company.users.some((u) => u.id === session.user.id);

      if (!isAdmin && !isFleetManagerMember) {
        return sendForbidden(reply, request, 'You do not have access to these settings');
      }

      const parsed = companySettingsUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendValidationError(reply, request, parsed.error, 'Invalid settings');
      }

      try {
        const before = await getOrCreateCompanySettings(company.id);
        const updated = await updateCompanySettings(company.id, parsed.data);

        const changedFields = Object.keys(parsed.data).filter(
          (k) => (before as Record<string, unknown>)[k] !== (updated as Record<string, unknown>)[k],
        );

        await createAuditLog({
          action: 'COMPANY_SETTINGS_UPDATED',
          actorUserId: session.user.id,
          companyId: company.id,
          entityType: 'CompanySettings',
          entityId: updated.id,
          details: JSON.stringify({ changedFields }),
          ipAddress: request.ip,
        });

        try {
          await recalculateUsageForCompany(company.id);
        } catch (recalcErr) {
          app.log.error(
            { err: recalcErr, companyId: company.id },
            'Failed to recalculate tire usage after settings update',
          );
        }

        return reply.send({ data: updated });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to update company settings');
        return sendInternalError(reply, request, 'Failed to update company settings');
      }
    },
  });
};
