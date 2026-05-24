import {
  catalogAdminListQuerySchema,
  catalogBrandRenameSchema,
  catalogModelEditSchema,
  catalogModerationSchema,
} from '@tirely/validators';
import type { FastifyInstance } from 'fastify';

import { getAdminSession } from '../../../../auth/auth.js';
import {
  sendConflict,
  sendInternalError,
  sendNotFound,
  sendValidationError,
} from '../../../../lib/responses.js';
import {
  editCatalogModel,
  listAdminCatalogBrands,
  listAdminCatalogModels,
  moderateCatalogBrand,
  moderateCatalogModel,
  renameCatalogBrand,
} from '../../../../repositories/catalog-admin.repository.js';

const hasStatusField = (body: unknown): body is Record<string, unknown> =>
  typeof body === 'object' && body !== null && Object.hasOwn(body, 'status');

const isPrismaNotFound = (err: unknown) =>
  typeof err === 'object' &&
  err !== null &&
  'code' in err &&
  (err as { code: string }).code === 'P2025';

export const adminCatalogRoutes = async (app: FastifyInstance) => {
  app.get('/models', {
    handler: async (request, reply) => {
      const session = await getAdminSession(request, reply);
      if (!session) return;

      const parsed = catalogAdminListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return sendValidationError(reply, request, parsed.error, 'Invalid query parameters');
      }

      try {
        const result = await listAdminCatalogModels(parsed.data);
        return reply.send({ data: result.rows, meta: result.meta });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to list admin catalog models');
        return sendInternalError(reply, request, 'Failed to list catalog models');
      }
    },
  });

  app.get('/brands', {
    handler: async (request, reply) => {
      const session = await getAdminSession(request, reply);
      if (!session) return;

      const parsed = catalogAdminListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return sendValidationError(reply, request, parsed.error, 'Invalid query parameters');
      }

      try {
        const brands = await listAdminCatalogBrands(parsed.data);
        return reply.send({ data: brands });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to list admin catalog brands');
        return sendInternalError(reply, request, 'Failed to list catalog brands');
      }
    },
  });

  app.patch('/models/:id', {
    handler: async (request, reply) => {
      const session = await getAdminSession(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };

      try {
        if (hasStatusField(request.body)) {
          const parsed = catalogModerationSchema.safeParse(request.body);
          if (!parsed.success) {
            return sendValidationError(reply, request, parsed.error, 'Invalid moderation payload');
          }

          const model = await moderateCatalogModel(id, parsed.data, session.user.id, request.ip);
          return reply.send({ data: model });
        }

        const parsed = catalogModelEditSchema.safeParse(request.body);
        if (!parsed.success) {
          return sendValidationError(reply, request, parsed.error, 'Invalid model edit payload');
        }

        const model = await editCatalogModel(id, parsed.data);
        return reply.send({ data: model });
      } catch (err) {
        if (isPrismaNotFound(err) || (err instanceof Error && err.message === 'NOT_FOUND')) {
          return sendNotFound(reply, request, 'Catalog model not found');
        }

        if (err instanceof Error) {
          if (err.message === 'MODEL_ALREADY_APPROVED') {
            return sendConflict(reply, request, 'Approved catalog models cannot be moderated');
          }
          if (err.message === 'MODEL_NOT_APPROVED') {
            return sendConflict(reply, request, 'Only approved catalog models can be edited');
          }
          if (err.message === 'PARENT_BRAND_REJECTED') {
            return sendConflict(
              reply,
              request,
              'Cannot approve a model whose parent brand is rejected. Approve the brand first.',
            );
          }
        }

        app.log.error({ err, requestId: request.id }, 'Failed to update catalog model');
        return sendInternalError(reply, request, 'Failed to update catalog model');
      }
    },
  });

  app.patch('/brands/:id', {
    handler: async (request, reply) => {
      const session = await getAdminSession(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };

      try {
        if (hasStatusField(request.body)) {
          const parsed = catalogModerationSchema.safeParse(request.body);
          if (!parsed.success) {
            return sendValidationError(reply, request, parsed.error, 'Invalid moderation payload');
          }

          const brand = await moderateCatalogBrand(id, parsed.data, session.user.id, request.ip);
          return reply.send({ data: brand });
        }

        const parsed = catalogBrandRenameSchema.safeParse(request.body);
        if (!parsed.success) {
          return sendValidationError(reply, request, parsed.error, 'Invalid brand rename payload');
        }

        const brand = await renameCatalogBrand(id, parsed.data.name);
        return reply.send({ data: brand });
      } catch (err) {
        if (isPrismaNotFound(err) || (err instanceof Error && err.message === 'NOT_FOUND')) {
          return sendNotFound(reply, request, 'Catalog brand not found');
        }

        if (err instanceof Error) {
          if (err.message === 'BRAND_ALREADY_APPROVED') {
            return sendConflict(reply, request, 'Approved catalog brands cannot be moderated');
          }
          if (err.message === 'BRAND_NOT_APPROVED') {
            return sendConflict(reply, request, 'Only approved catalog brands can be renamed');
          }
          if (err.message === 'BRAND_NAME_CONFLICT') {
            return sendConflict(
              reply,
              request,
              'A brand with this name already exists. Merge it manually instead.',
            );
          }
        }

        app.log.error({ err, requestId: request.id }, 'Failed to update catalog brand');
        return sendInternalError(reply, request, 'Failed to update catalog brand');
      }
    },
  });
};

export const registerAdminCatalogRoutes = async (app: FastifyInstance) => {
  await app.register(adminCatalogRoutes, { prefix: '/catalog' });
};
