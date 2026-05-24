import { firstLoginPasswordSchema } from '@tirely/validators';
import { FastifyInstance } from 'fastify';

import { auth, getSession } from '../../../auth/auth.js';
import {
  sendForbidden,
  sendInternalError,
  sendNotFound,
  sendValidationError,
} from '../../../lib/responses.js';
import {
  clearUserFirstLoginFlag,
  findUserFirstLoginFlag,
  findUserWithCompanySlug,
  setCredentialPassword,
} from '../../../repositories/user.repository.js';

const meRoutes = async (app: FastifyInstance) => {
  app.get('/me', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);
      if (!session) {
        return;
      }

      try {
        const user = await findUserWithCompanySlug(session.user.id);

        if (!user) {
          return sendNotFound(reply, request, 'User not found');
        }

        return reply.send({
          data: {
            id: user.id,
            email: user.email,
            role: user.role ?? null,
            company: user.company ? { slug: user.company.slug } : null,
          },
        });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to fetch current user');

        return sendInternalError(reply, request, 'Failed to fetch current user');
      }
    },
  });

  app.patch('/me/first-login-password', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);
      if (!session) {
        return;
      }

      const result = firstLoginPasswordSchema.safeParse(request.body);
      if (!result.success) {
        return sendValidationError(reply, request, result.error, 'Invalid password');
      }

      try {
        const flag = await findUserFirstLoginFlag(session.user.id);
        if (!flag) {
          return sendNotFound(reply, request, 'User not found');
        }
        if (!flag.firstLogin) {
          return sendForbidden(
            reply,
            request,
            'First-login password change is not allowed for this account',
          );
        }

        const ctx = await auth.$context;
        const hashed = await ctx.password.hash(result.data.password);

        const updated = await setCredentialPassword(session.user.id, hashed);
        if (updated === 0) {
          app.log.error(
            { requestId: request.id, userId: session.user.id },
            'No credential account found for user during first-login password change',
          );
          return sendInternalError(reply, request, 'No credential account found for user');
        }

        await clearUserFirstLoginFlag(session.user.id);

        return reply.send({ data: { success: true } });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to set first-login password');

        return sendInternalError(reply, request, 'Failed to set first-login password');
      }
    },
  });
};

export const registerMeRoutes = async (app: FastifyInstance) => {
  await app.register(meRoutes, { prefix: '/v1' });
};
