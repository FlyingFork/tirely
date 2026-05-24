import { prisma } from '@tirely/database';
import { USER_ROLES } from '@tirely/types';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin as adminPlugin } from 'better-auth/plugins';
import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from 'fastify';

import { getEmailService } from '../lib/email/index.js';
import { passwordResetEmail } from '../lib/email/templates/password-reset.js';
import { parseAllowedOrigins } from '../lib/origins.js';
import { findCompanyBySlugForAccessCheck } from '../repositories/company.repository.js';
import { sendForbidden, sendNotFound } from '../lib/responses.js';
import { ac, admin, user, fleet_manager, maintenance, driver } from './permissions';

let authLogger: Pick<FastifyBaseLogger, 'error'> | null = null;

export const setAuthLogger = (logger: Pick<FastifyBaseLogger, 'error'>) => {
  authLogger = logger;
};

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:4000',
  secret: process.env.BETTER_AUTH_SECRET,
  user: {
    additionalFields: {
      firstLogin: {
        type: 'boolean',
        required: false,
      },
      companyId: {
        type: 'string',
        required: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({
      user: u,
      url,
    }: {
      user: { name: string; email: string };
      url: string;
    }) => {
      // void — don't await to prevent timing attacks (per better-auth docs)
      void getEmailService()
        .send({ to: u.email, ...passwordResetEmail({ name: u.name, url }) })
        .catch((err) =>
          authLogger?.error({ err, email: u.email }, 'Failed to send password reset email'),
        );
    },
  },
  plugins: [
    adminPlugin({
      ac,
      roles: {
        admin,
        user,
        fleet_manager,
        maintenance,
        driver,
      },
      defaultRole: 'driver',
      adminRoles: ['admin'],
    }),
  ],
  trustedOrigins: parseAllowedOrigins(process.env.CORS_ORIGIN),
});

// Sends the 401 reply itself when auth fails; callers must early-return on null.
export const getSession = async (request: FastifyRequest, reply: FastifyReply) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    await reply.status(401).send({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
      statusCode: 401,
      requestId: request.id,
    });
    return null;
  }

  return session;
};

// Sends 401/403 itself when auth/role check fails; callers must early-return on null.
export const getAdminSession = async (request: FastifyRequest, reply: FastifyReply) => {
  const session = await getSession(request, reply);
  if (!session) return null;

  if (session.user.role !== USER_ROLES.ADMIN) {
    await reply.status(403).send({
      code: 'FORBIDDEN',
      message: 'Insufficient permissions',
      statusCode: 403,
      requestId: request.id,
    });
    return null;
  }

  return session;
};

// Returns { session, company } for any authenticated company member (or admin); null on failure.
export const requireCompanyAccess = async (
  request: FastifyRequest,
  reply: FastifyReply,
  slug: string,
) => {
  const session = await getSession(request, reply);
  if (!session) return null;

  const company = await findCompanyBySlugForAccessCheck(slug);
  if (!company) {
    sendNotFound(reply, request, 'Company not found');
    return null;
  }

  const isAdmin = session.user.role === USER_ROLES.ADMIN;
  const isMember = company.users.some((u) => u.id === session.user.id);
  if (!isAdmin && !isMember) {
    sendForbidden(reply, request, 'Access denied');
    return null;
  }

  return { session, company };
};

// Returns { session, company } for fleet_manager or admin; null on failure.
export const requireFleetManager = async (
  request: FastifyRequest,
  reply: FastifyReply,
  slug: string,
) => {
  const access = await requireCompanyAccess(request, reply, slug);
  if (!access) return null;

  const { session, company } = access;
  const isAdmin = session.user.role === USER_ROLES.ADMIN;
  const isFleetManager =
    session.user.role === USER_ROLES.FLEET_MANAGER &&
    company.users.some((u) => u.id === session.user.id);

  if (!isAdmin && !isFleetManager) {
    sendForbidden(reply, request, 'Fleet manager access required');
    return null;
  }

  return { session, company };
};

// Returns { session, company } for fleet_manager, maintenance, or admin; null on failure.
export const requireFleetManagerOrMaintenance = async (
  request: FastifyRequest,
  reply: FastifyReply,
  slug: string,
) => {
  const access = await requireCompanyAccess(request, reply, slug);
  if (!access) return null;

  const { session, company } = access;
  const role = session.user.role;
  const isAdmin = role === USER_ROLES.ADMIN;
  const isMember = company.users.some((u) => u.id === session.user.id);
  const isAllowed =
    isMember && (role === USER_ROLES.FLEET_MANAGER || role === USER_ROLES.MAINTENANCE);

  if (!isAdmin && !isAllowed) {
    sendForbidden(reply, request, 'Fleet manager or maintenance access required');
    return null;
  }

  return { session, company };
};
