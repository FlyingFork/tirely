import { tireSetCreateSchema, tireSetUpdateSchema } from '@tirely/validators';
import type { FastifyInstance } from 'fastify';

import { requireCompanyAccess, requireFleetManagerOrMaintenance } from '../../../auth/auth.js';
import { sendInternalError, sendNotFound, sendValidationError } from '../../../lib/responses.js';
import {
  createTireSet,
  dissolveTireSet,
  getTireSetById,
  listTireSets,
  updateTireSet,
} from '../../../repositories/tire-set.repository.js';
import { createAuditLog } from '../../../repositories/audit-log.repository.js';

export const tireSetRoutes = async (app: FastifyInstance) => {
  app.get('/:slug/tire-sets', {
    handler: async (request, reply) => {
      const access = await requireCompanyAccess(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      try {
        const sets = await listTireSets(access.company.id);
        return reply.send({ data: sets });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to list tire sets');
        return sendInternalError(reply, request, 'Failed to list tire sets');
      }
    },
  });

  app.get('/:slug/tire-sets/:id', {
    handler: async (request, reply) => {
      const access = await requireCompanyAccess(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      try {
        const set = await getTireSetById((request.params as { id: string }).id, access.company.id);
        if (!set) return sendNotFound(reply, request, 'Tire set not found');
        return reply.send({ data: set });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to fetch tire set');
        return sendInternalError(reply, request, 'Failed to fetch tire set');
      }
    },
  });

  app.post('/:slug/tire-sets', {
    handler: async (request, reply) => {
      const access = await requireFleetManagerOrMaintenance(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = tireSetCreateSchema.safeParse(request.body);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid tire set');

      try {
        const set = await createTireSet(access.company.id, parsed.data);
        await createAuditLog({
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          action: 'TIRE_SET_CREATED',
          entityType: 'TireSet',
          entityId: set.id,
          details: JSON.stringify({ name: set.name, tireCount: set.tires.length }),
          ipAddress: request.ip,
        });
        reply.status(201);
        return reply.send({ data: set });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to create tire set');
        return sendInternalError(reply, request, 'Failed to create tire set');
      }
    },
  });

  app.patch('/:slug/tire-sets/:id', {
    handler: async (request, reply) => {
      const access = await requireFleetManagerOrMaintenance(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = tireSetUpdateSchema.safeParse(request.body);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid tire set');

      try {
        const existing = await getTireSetById(
          (request.params as { id: string }).id,
          access.company.id,
        );
        if (!existing) return sendNotFound(reply, request, 'Tire set not found');

        const updated = await updateTireSet(existing.id, access.company.id, parsed.data);
        await createAuditLog({
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          action: 'TIRE_SET_UPDATED',
          entityType: 'TireSet',
          entityId: updated.id,
          details: JSON.stringify({ changedFields: Object.keys(parsed.data) }),
          ipAddress: request.ip,
        });
        return reply.send({ data: updated });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to update tire set');
        return sendInternalError(reply, request, 'Failed to update tire set');
      }
    },
  });

  app.delete('/:slug/tire-sets/:id', {
    handler: async (request, reply) => {
      const access = await requireFleetManagerOrMaintenance(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      try {
        const existing = await getTireSetById(
          (request.params as { id: string }).id,
          access.company.id,
        );
        if (!existing) return sendNotFound(reply, request, 'Tire set not found');

        await dissolveTireSet(existing.id);
        await createAuditLog({
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          action: 'TIRE_SET_DISSOLVED',
          entityType: 'TireSet',
          entityId: existing.id,
          details: JSON.stringify({ name: existing.name, tireCount: existing.tires.length }),
          ipAddress: request.ip,
        });
        return reply.send({ data: { ok: true } });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to dissolve tire set');
        return sendInternalError(reply, request, 'Failed to dissolve tire set');
      }
    },
  });
};
