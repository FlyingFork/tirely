import { companyListQuerySchema } from '@tirely/validators';
import { USER_ROLES } from '@tirely/types';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import { getAdminSession, getSession } from '../../../auth/auth.js';
import {
  sendForbidden,
  sendInternalError,
  sendNotFound,
  sendValidationError,
} from '../../../lib/responses.js';
import {
  findCompanyBySlugWithUsers,
  listCompanies,
} from '../../../repositories/company.repository.js';

function parseCompanyListQuery(request: FastifyRequest) {
  return companyListQuerySchema.safeParse(request.query);
}

function companyListItem(company: Awaited<ReturnType<typeof listCompanies>>['companies'][number]) {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    status: company.status,
    contactEmail: company.contactEmail,
    contactPhone: company.contactPhone,
    address: company.address,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    userCount: company._count.users,
  };
}

function companyDetail(company: NonNullable<Awaited<ReturnType<typeof findCompanyBySlugWithUsers>>>) {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    status: company.status,
    contactEmail: company.contactEmail,
    contactPhone: company.contactPhone,
    address: company.address,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    users: company.users,
  };
}

function canReadCompany(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  company: NonNullable<Awaited<ReturnType<typeof findCompanyBySlugWithUsers>>>,
) {
  return session.user.role === USER_ROLES.ADMIN || company.users.some((u) => u.id === session.user.id);
}

export const companyRoutes = async (app: FastifyInstance) => {
  app.get('/', {
    handler: async (request, reply) => {
      const session = await getAdminSession(request, reply);
      if (!session) {
        return;
      }

      const queryResult = parseCompanyListQuery(request);
      if (!queryResult.success) {
        return sendValidationError(reply, request, queryResult.error, 'Invalid query parameters');
      }

      const { page, perPage, status, search, sortBy, sortOrder } = queryResult.data;
      const skip = (page - 1) * perPage;

      try {
        const { companies, total } = await listCompanies({
          skip,
          take: perPage,
          status,
          search,
          sortBy,
          sortOrder,
        });

        return reply.send({
          data: companies.map(companyListItem),
          meta: { page, perPage, total },
        });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to fetch companies');

        return sendInternalError(reply, request, 'Failed to fetch companies');
      }
    },
  });

  app.get('/:slug', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);
      if (!session) {
        return;
      }

      const { slug } = request.params as { slug: string };

      const company = await findCompanyBySlugWithUsers(slug);

      if (!company) {
        return sendNotFound(reply, request, 'Company not found');
      }

      if (!canReadCompany(session, company)) {
        return sendForbidden(reply, request, 'You do not have access to this company');
      }

      return reply.send({
        data: companyDetail(company),
      });
    },
  });
};
