import {
  companyUserInviteSchema,
  companyUserListQuerySchema,
  companyUserUpdateRoleSchema,
} from '@tirely/validators';
import { FastifyInstance } from 'fastify';

import { requireCompanyAccess, requireFleetManager } from '../../../auth/auth.js';
import { inviteUserToCompany } from '../../../lib/companyUser.js';
import { getEmailService } from '../../../lib/email/index.js';
import { userInviteEmail } from '../../../lib/email/templates/user-invite.js';
import {
  sendConflict,
  sendForbidden,
  sendInternalError,
  sendNotFound,
  sendValidationError,
} from '../../../lib/responses.js';
import { createAuditLog } from '../../../repositories/audit-log.repository.js';
import {
  findUserByEmail,
  listCompanyUsers,
  setUserBanned,
  updateUserRole,
} from '../../../repositories/user.repository.js';

export const companyUserRoutes = async (app: FastifyInstance) => {
  app.get('/:slug/users', {
    handler: async (request, reply) => {
      const access = await requireCompanyAccess(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = companyUserListQuerySchema.safeParse(request.query);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid query');

      try {
        const result = await listCompanyUsers({ companyId: access.company.id, ...parsed.data });
        return reply.send({ data: result.users, meta: result.meta });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to list company users');
        return sendInternalError(reply, request, 'Failed to list company users');
      }
    },
  });

  app.post('/:slug/users', {
    handler: async (request, reply) => {
      const access = await requireFleetManager(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = companyUserInviteSchema.safeParse(request.body);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid invite');

      const existing = await findUserByEmail(parsed.data.email);
      if (existing) return sendConflict(reply, request, 'A user with this email already exists');

      try {
        const { user, tempPassword } = await inviteUserToCompany({
          ...parsed.data,
          companyId: access.company.id,
        });

        try {
          await getEmailService().send({
            to: parsed.data.email,
            ...userInviteEmail({
              companyName: access.company.name,
              inviteeName: parsed.data.name,
              loginEmail: parsed.data.email,
              tempPassword,
              signInUrl: `${process.env.APP_URL ?? 'http://localhost:3000'}/sign-in`,
              invitedRole: parsed.data.role,
            }),
          });
        } catch (emailErr) {
          app.log.error({ err: emailErr, requestId: request.id }, 'Failed to send invite email');
        }

        await createAuditLog({
          action: 'USER_INVITED',
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          entityType: 'User',
          entityId: user.id,
          details: JSON.stringify({ invitedRole: parsed.data.role }),
          ipAddress: request.ip,
        });

        reply.status(201);
        return reply.send({ data: { id: user.id, email: user.email, role: user.role } });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to invite company user');
        return sendInternalError(reply, request, 'Failed to invite user');
      }
    },
  });

  app.patch('/:slug/users/:userId/role', {
    handler: async (request, reply) => {
      const access = await requireFleetManager(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = companyUserUpdateRoleSchema.safeParse(request.body);
      if (!parsed.success) return sendValidationError(reply, request, parsed.error, 'Invalid role');

      const { userId } = request.params as { userId: string };
      if (userId === access.session.user.id)
        return sendForbidden(reply, request, 'Cannot change your own role');

      const target = access.company.users.find((u) => u.id === userId);
      if (!target) return sendNotFound(reply, request, 'User not found');

      try {
        const updated = await updateUserRole(userId, parsed.data.role);

        await createAuditLog({
          action: 'USER_ROLE_CHANGED',
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          entityType: 'User',
          entityId: userId,
          details: JSON.stringify({ from: target.role, to: parsed.data.role }),
          ipAddress: request.ip,
        });

        return reply.send({ data: { id: updated.id, role: updated.role } });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to update user role');
        return sendInternalError(reply, request, 'Failed to update user role');
      }
    },
  });

  app.patch('/:slug/users/:userId/status', {
    handler: async (request, reply) => {
      const access = await requireFleetManager(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const { active } = request.body as { active: boolean };
      const { userId } = request.params as { userId: string };
      const target = access.company.users.find((u) => u.id === userId);
      if (!target) return sendNotFound(reply, request, 'User not found');

      try {
        await setUserBanned(userId, !active);

        await createAuditLog({
          action: active ? 'USER_REACTIVATED' : 'USER_DEACTIVATED',
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          entityType: 'User',
          entityId: userId,
          ipAddress: request.ip,
        });

        return reply.send({ data: { id: userId, active } });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to update user status');
        return sendInternalError(reply, request, 'Failed to update user status');
      }
    },
  });
};
