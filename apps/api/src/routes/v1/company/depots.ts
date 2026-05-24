import { depotCreateSchema, depotListQuerySchema, depotUpdateSchema } from '@tirely/validators';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireCompanyAccess, requireFleetManager } from '../../../auth/auth.js';
import {
  sendConflict,
  sendInternalError,
  sendNotFound,
  sendValidationError,
} from '../../../lib/responses.js';
import { createAuditLog } from '../../../repositories/audit-log.repository.js';
import {
  createDepot,
  findDepotById,
  findDepotByName,
  listDepots,
  setDepotArchived,
  updateDepot,
} from '../../../repositories/depot.repository.js';

export const depotRoutes = async (app: FastifyInstance) => {
  app.get('/:slug/depots', {
    handler: async (request, reply) => {
      const access = await requireCompanyAccess(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = depotListQuerySchema.safeParse(request.query);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid query');

      try {
        const result = await listDepots({ companyId: access.company.id, ...parsed.data });
        return reply.send({ data: result.rows, meta: result.meta });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to list depots');
        return sendInternalError(reply, request, 'Failed to list depots');
      }
    },
  });

  app.get('/:slug/depots/:id', {
    handler: async (request, reply) => {
      const access = await requireCompanyAccess(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      try {
        const depot = await findDepotById(access.company.id, (request.params as { id: string }).id);
        if (!depot) return sendNotFound(reply, request, 'Depot not found');
        return reply.send({ data: { ...depot, vehicleCount: depot._count.vehicles } });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to fetch depot');
        return sendInternalError(reply, request, 'Failed to fetch depot');
      }
    },
  });

  app.post('/:slug/depots', {
    handler: async (request, reply) => {
      const access = await requireFleetManager(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = depotCreateSchema.safeParse(request.body);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid depot');

      try {
        const dup = await findDepotByName(access.company.id, parsed.data.name);
        if (dup) return sendConflict(reply, request, 'A depot with this name already exists');

        const depot = await createDepot(access.company.id, parsed.data);
        await createAuditLog({
          action: 'DEPOT_CREATED',
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          entityType: 'Depot',
          entityId: depot.id,
          details: JSON.stringify({ name: depot.name }),
          ipAddress: request.ip,
        });
        reply.status(201);
        return reply.send({ data: depot });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to create depot');
        return sendInternalError(reply, request, 'Failed to create depot');
      }
    },
  });

  app.patch('/:slug/depots/:id', {
    handler: async (request, reply) => {
      const access = await requireFleetManager(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = depotUpdateSchema.safeParse(request.body);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid depot');

      try {
        const depot = await findDepotById(access.company.id, (request.params as { id: string }).id);
        if (!depot) return sendNotFound(reply, request, 'Depot not found');

        if (parsed.data.name && parsed.data.name !== depot.name) {
          const dup = await findDepotByName(access.company.id, parsed.data.name);
          if (dup && dup.id !== depot.id)
            return sendConflict(reply, request, 'A depot with this name already exists');
        }

        const updated = await updateDepot(depot.id, parsed.data);
        await createAuditLog({
          action: 'DEPOT_UPDATED',
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          entityType: 'Depot',
          entityId: depot.id,
          details: JSON.stringify({ changedFields: Object.keys(parsed.data) }),
          ipAddress: request.ip,
        });
        return reply.send({ data: updated });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to update depot');
        return sendInternalError(reply, request, 'Failed to update depot');
      }
    },
  });

  app.patch('/:slug/depots/:id/archive', {
    handler: async (request, reply) => {
      const access = await requireFleetManager(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const archiveBodySchema = z.object({ archived: z.boolean() });
      const parsed = archiveBodySchema.safeParse(request.body);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid request body');
      const { archived } = parsed.data;

      try {
        const depot = await findDepotById(access.company.id, (request.params as { id: string }).id);
        if (!depot) return sendNotFound(reply, request, 'Depot not found');

        const updated = await setDepotArchived(depot.id, archived);
        await createAuditLog({
          action: archived ? 'DEPOT_ARCHIVED' : 'DEPOT_UNARCHIVED',
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          entityType: 'Depot',
          entityId: depot.id,
          ipAddress: request.ip,
        });
        return reply.send({ data: updated });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to archive depot');
        return sendInternalError(reply, request, 'Failed to archive depot');
      }
    },
  });
};
