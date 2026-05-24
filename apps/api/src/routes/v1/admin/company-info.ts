import type { FastifyInstance } from 'fastify';

import { getAdminSession } from '../../../auth/auth.js';
import { sendInternalError, sendNotFound } from '../../../lib/responses.js';
import { findCompanyById } from '../../../repositories/company.repository.js';

type CompanyInfo = NonNullable<Awaited<ReturnType<typeof findCompanyById>>>;
type CompanyInfoLookup =
  | { ok: true; company: CompanyInfo | null }
  | { ok: false; failure: unknown };


function getCompanyInfoParams(request: { params: unknown }) {
  return request.params as { id: string };
}



async function findCompanyInfo(id: string): Promise<CompanyInfoLookup> {
  return findCompanyById(id).then(
    (company) => ({ ok: true, company }),
    (failure) => ({ ok: false, failure }),
  );
}


function companyInfoPayload(company: CompanyInfo) {
  return { data: company };
}


export const registerAdminCompanyInfoRoutes = async (app: FastifyInstance) => {
  app.get('/company-info/:id', {
    handler: async (request, reply) => {
      const session = await getAdminSession(request, reply);
      if (!session) return;

      const { id } = getCompanyInfoParams(request);
      const lookup = await findCompanyInfo(id);

      if (!lookup.ok) {
        app.log.error({ err: lookup.failure, requestId: request.id }, 'Failed to fetch company');
        return sendInternalError(reply, request, 'Failed to fetch company');
      }
      if (!lookup.company) return sendNotFound(reply, request, 'Company not found');

      return reply.send(companyInfoPayload(lookup.company));
    },
  });
};
