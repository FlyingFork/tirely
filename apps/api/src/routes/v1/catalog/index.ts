import {
  catalogBrandCreateSchema,
  catalogListQuerySchema,
  catalogModelCreateSchema,
  catalogModelSizeCreateSchema,
} from '@tirely/validators';
import type { FastifyInstance } from 'fastify';

import { getSession } from '../../../auth/auth.js';
import {
  sendConflict,
  sendForbidden,
  sendInternalError,
  sendValidationError,
} from '../../../lib/responses.js';
import { createAuditLog } from '../../../repositories/audit-log.repository.js';
import {
  addSizeToModel,
  createPendingModel,
  listCatalogBrands,
  listCatalogModels,
  listCatalogSizes,
  upsertPendingBrand,
} from '../../../repositories/catalog.repository.js';
import { findUserCompanyId } from '../../../repositories/user.repository.js';

const catalogRoutes = async (app: FastifyInstance) => {
  app.get('/brands', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);
      if (!session) return;

      const parsed = catalogListQuerySchema.safeParse(request.query);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid query');

      try {
        const userRecord = await findUserCompanyId(session.user.id);
        const brands = await listCatalogBrands({
          search: parsed.data.search,
          submittedByCompanyId: userRecord?.companyId ?? undefined,
          limit: parsed.data.perPage,
        });
        return reply.send({ data: brands });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to list catalog brands');
        return sendInternalError(reply, request, 'Failed to list catalog brands');
      }
    },
  });

  app.get('/brands/:brandId/models', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);
      if (!session) return;

      const parsed = catalogListQuerySchema.safeParse(request.query);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid query');

      try {
        const userRecord = await findUserCompanyId(session.user.id);
        const models = await listCatalogModels({
          brandId: (request.params as { brandId: string }).brandId,
          search: parsed.data.search,
          submittedByCompanyId: userRecord?.companyId ?? undefined,
          limit: parsed.data.perPage,
        });
        return reply.send({ data: models });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to list catalog models');
        return sendInternalError(reply, request, 'Failed to list catalog models');
      }
    },
  });

  app.get('/models/:modelId/sizes', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);
      if (!session) return;

      try {
        const sizes = await listCatalogSizes((request.params as { modelId: string }).modelId);
        return reply.send({ data: sizes });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to list catalog sizes');
        return sendInternalError(reply, request, 'Failed to list catalog sizes');
      }
    },
  });

  app.post('/brands', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);
      if (!session) return;

      const parsed = catalogBrandCreateSchema.safeParse(request.body);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid brand');

      try {
        const userRecord = await findUserCompanyId(session.user.id);
        const brand = await upsertPendingBrand(parsed.data.name);
        await createAuditLog({
          action: 'CATALOG_BRAND_SUBMITTED',
          actorUserId: session.user.id,
          companyId: userRecord?.companyId ?? null,
          entityType: 'CatalogBrand',
          entityId: brand.id,
          details: JSON.stringify({ name: brand.name }),
          ipAddress: request.ip,
        });
        return reply.send({ data: brand });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to submit catalog brand');
        return sendInternalError(reply, request, 'Failed to submit catalog brand');
      }
    },
  });

  app.post('/models', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);
      if (!session) return;

      const userRecord = await findUserCompanyId(session.user.id);
      if (!userRecord?.companyId) {
        return sendForbidden(reply, request, 'Only company users can submit catalog models');
      }

      const parsed = catalogModelCreateSchema.safeParse(request.body);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid model');

      try {
        const model = await createPendingModel({
          ...parsed.data,
          submittedByCompanyId: userRecord.companyId,
        });
        await createAuditLog({
          action: 'CATALOG_MODEL_SUBMITTED',
          actorUserId: session.user.id,
          companyId: userRecord.companyId,
          entityType: 'CatalogModel',
          entityId: model.id,
          details: JSON.stringify({ name: model.name, brandId: model.brandId }),
          ipAddress: request.ip,
        });
        reply.status(201);
        return reply.send({ data: model });
      } catch (err: unknown) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === 'P2002'
        ) {
          return sendConflict(
            reply,
            request,
            'A model with this name already exists for this brand',
          );
        }
        app.log.error({ err, requestId: request.id }, 'Failed to submit catalog model');
        return sendInternalError(reply, request, 'Failed to submit catalog model');
      }
    },
  });

  app.post('/models/:modelId/sizes', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);
      if (!session) return;

      const parsed = catalogModelSizeCreateSchema.safeParse(request.body);
      if (!parsed.success) return sendValidationError(reply, request, parsed.error, 'Invalid size');

      try {
        const size = await addSizeToModel(
          (request.params as { modelId: string }).modelId,
          parsed.data,
        );
        reply.status(201);
        return reply.send({ data: size });
      } catch (err: unknown) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === 'P2002'
        ) {
          return sendConflict(reply, request, 'This size already exists for this model');
        }
        app.log.error({ err, requestId: request.id }, 'Failed to add size to catalog model');
        return sendInternalError(reply, request, 'Failed to add size to catalog model');
      }
    },
  });
};

export const registerCatalogRoutes = async (app: FastifyInstance) => {
  await app.register(catalogRoutes, { prefix: '/v1/catalog' });
};
