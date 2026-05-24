import {
  companyRequestCreationSchema,
  companyRequestListQuerySchema,
  companyRequestStatusQuerySchema,
  companyRequestUpdateSchema,
} from '@tirely/validators';
import { FastifyInstance } from 'fastify';

import { getAdminSession } from '../../../auth/auth.js';
import { inviteUserToCompany } from '../../../lib/companyUser.js';
import { getEmailService } from '../../../lib/email/index.js';
import { companyRequestApprovedEmail } from '../../../lib/email/templates/company-request-approved.js';
import { companyRequestRejectedEmail } from '../../../lib/email/templates/company-request-rejected.js';
import { companyRequestSubmittedEmail } from '../../../lib/email/templates/company-request-submitted.js';
import {
  sendConflict,
  sendInternalError,
  sendNotFound,
  sendValidationError,
} from '../../../lib/responses.js';
import { createAuditLog } from '../../../repositories/audit-log.repository.js';
import {
  createCompany,
  generateUniqueCompanySlug,
} from '../../../repositories/company.repository.js';
import {
  createCompanyRequest,
  findCompanyRequestById,
  findLatestCompanyRequestByEmail,
  listCompanyRequests,
  updateCompanyRequestStatus,
} from '../../../repositories/company-request.repository.js';

export const companyRequestRoutes = async (app: FastifyInstance) => {
  app.post('/request', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
    handler: async (request, reply) => {
      const zodResult = companyRequestCreationSchema.safeParse(request.body);
      if (!zodResult.success) {
        return sendValidationError(reply, request, zodResult.error, 'Invalid request data');
      }

      try {
        const companyRequest = await createCompanyRequest(zodResult.data);

        try {
          await getEmailService().send({
            to: zodResult.data.companyEmail,
            ...companyRequestSubmittedEmail({
              companyName: zodResult.data.companyName,
              contactPersonName: zodResult.data.contactPersonName,
            }),
          });
        } catch (emailErr) {
          app.log.error(
            { err: emailErr, requestId: request.id },
            'Failed to send request-submitted email',
          );
        }

        return reply.status(201).send({ data: companyRequest });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to create company request');

        return sendInternalError(reply, request, 'Failed to create company request');
      }
    },
  });

  app.get('/request/status', {
    handler: async (request, reply) => {
      const queryResult = companyRequestStatusQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return sendValidationError(reply, request, queryResult.error, 'Invalid query parameters');
      }

      const { email } = queryResult.data;

      try {
        const companyRequest = await findLatestCompanyRequestByEmail(email);

        if (!companyRequest) {
          return sendNotFound(reply, request, 'No request found for this email address');
        }

        return reply.send({ data: companyRequest });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to fetch company request status');

        return sendInternalError(reply, request, 'Failed to fetch company request status');
      }
    },
  });

  app.get('/request/:id', {
    handler: async (request, reply) => {
      const session = await getAdminSession(request, reply);
      if (!session) {
        return;
      }

      const { id } = request.params as { id: string };

      const companyRequest = await findCompanyRequestById(id);

      if (!companyRequest) {
        return sendNotFound(reply, request, 'Company request not found');
      }

      return reply.send({ data: companyRequest });
    },
  });

  app.get('/request', {
    handler: async (request, reply) => {
      const session = await getAdminSession(request, reply);
      if (!session) {
        return;
      }

      const queryResult = companyRequestListQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return sendValidationError(reply, request, queryResult.error, 'Invalid query parameters');
      }

      const { page, perPage, status, search, sortOrder } = queryResult.data;
      const skip = (page - 1) * perPage;

      try {
        const { requests, total } = await listCompanyRequests({
          skip,
          take: perPage,
          status,
          search,
          sortOrder,
        });

        return reply.send({
          data: requests,
          meta: { page, perPage, total },
        });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to fetch company requests');

        return sendInternalError(reply, request, 'Failed to fetch company requests');
      }
    },
  });

  app.patch('/request/:id', {
    handler: async (request, reply) => {
      const session = await getAdminSession(request, reply);
      if (!session) {
        return;
      }

      const zodResult = companyRequestUpdateSchema.safeParse(request.body);
      if (!zodResult.success) {
        return sendValidationError(reply, request, zodResult.error, 'Invalid request data');
      }

      const { id } = request.params as { id: string };
      const reviewedByUserId = session.user.id;

      try {
        const existingCompanyRequest = await findCompanyRequestById(id);

        if (!existingCompanyRequest) {
          return sendNotFound(reply, request, 'Company request not found');
        }

        if (existingCompanyRequest.status !== 'PENDING') {
          return sendConflict(reply, request, 'Company request has already been reviewed');
        }

        if (zodResult.data.status === 'APPROVED') {
          const slug = await generateUniqueCompanySlug(existingCompanyRequest.companyName);

          const newCompany = await createCompany({
            name: existingCompanyRequest.companyName,
            slug,
            contactEmail: existingCompanyRequest.companyEmail,
            contactPhone: existingCompanyRequest.contactPersonPhone,
            companyRequestId: existingCompanyRequest.id,
          });

          const { tempPassword: password } = await inviteUserToCompany({
            email: existingCompanyRequest.companyEmail,
            name: existingCompanyRequest.contactPersonName,
            role: 'fleet_manager',
            companyId: newCompany.id,
          });

          try {
            await getEmailService().send({
              to: existingCompanyRequest.companyEmail,
              ...companyRequestApprovedEmail({
                companyName: existingCompanyRequest.companyName,
                contactPersonName: existingCompanyRequest.contactPersonName,
                loginEmail: existingCompanyRequest.companyEmail,
                tempPassword: password,
                signInUrl: `${process.env.APP_URL ?? 'http://localhost:3000'}/sign-in`,
              }),
            });
          } catch (emailErr) {
            app.log.error(
              { err: emailErr, requestId: request.id, companyId: newCompany.id },
              'Failed to send approval email',
            );
          }

          const companyRequest = await updateCompanyRequestStatus({
            id,
            status: 'APPROVED',
            rejectionReason: null,
            reviewedByUserId: reviewedByUserId ?? null,
          });

          await createAuditLog({
            action: 'COMPANY_REQUEST_APPROVED',
            actorUserId: session.user.id,
            companyId: newCompany.id,
            entityType: 'CompanyRequest',
            entityId: existingCompanyRequest.id,
            ipAddress: request.ip,
          });

          await createAuditLog({
            action: 'COMPANY_CREATED',
            actorUserId: null,
            companyId: newCompany.id,
            entityType: 'Company',
            entityId: newCompany.id,
          });

          return reply.send({ data: companyRequest });
        }

        const companyRequest = await updateCompanyRequestStatus({
          id,
          status: 'REJECTED',
          rejectionReason: zodResult.data.rejectionReason ?? null,
          reviewedByUserId: reviewedByUserId ?? null,
        });

        await createAuditLog({
          action: 'COMPANY_REQUEST_REJECTED',
          actorUserId: session.user.id,
          entityType: 'CompanyRequest',
          entityId: existingCompanyRequest.id,
          ipAddress: request.ip,
        });

        try {
          await getEmailService().send({
            to: existingCompanyRequest.companyEmail,
            ...companyRequestRejectedEmail({
              companyName: existingCompanyRequest.companyName,
              contactPersonName: existingCompanyRequest.contactPersonName,
              rejectionReason: zodResult.data.rejectionReason,
            }),
          });
        } catch (emailErr) {
          app.log.error({ err: emailErr, requestId: request.id }, 'Failed to send rejection email');
        }

        return reply.send({ data: companyRequest });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to update company request');

        return sendInternalError(reply, request, 'Failed to update company request');
      }
    },
  });
};
