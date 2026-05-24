import {
  tireBatchCreateSchema,
  tireCreateSchema,
  tireListQuerySchema,
  tireUpdateSchema,
} from '@tirely/validators';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';

import { requireCompanyAccess, requireFleetManagerOrMaintenance } from '../../../auth/auth.js';
import {
  sendConflict,
  sendInternalError,
  sendNotFound,
  sendValidationError,
} from '../../../lib/responses.js';
import { createAuditLog } from '../../../repositories/audit-log.repository.js';
import { findDepotById } from '../../../repositories/depot.repository.js';
import {
  createTire,
  createTiresBatch,
  disposeTire,
  findTireForCompany,
  listTires,
  updateTireMetadata,
} from '../../../repositories/tire.repository.js';
import { computeLiveUsageForTire } from '../../../services/usage-algorithm/recalculate.js';

const disposeBodySchema = z.object({
  date: z.coerce.date(),
});

export const tireRoutes = async (app: FastifyInstance) => {
  app.get('/:slug/tires', {
    handler: async (request, reply) => {
      const access = await requireCompanyAccess(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = tireListQuerySchema.safeParse(request.query);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid query');

      try {
        const result = await listTires({ companyId: access.company.id, ...parsed.data });
        return reply.send({ data: result.rows, meta: result.meta });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to list tires');
        return sendInternalError(reply, request, 'Failed to list tires');
      }
    },
  });

  app.get('/:slug/tires/:id', {
    handler: async (request, reply) => {
      const access = await requireCompanyAccess(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      try {
        const tire = await findTireForCompany(
          access.company.id,
          (request.params as { id: string }).id,
        );
        if (!tire) return sendNotFound(reply, request, 'Tire not found');
        return reply.send({ data: tire });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to fetch tire');
        return sendInternalError(reply, request, 'Failed to fetch tire');
      }
    },
  });

  app.get('/:slug/tires/:id/usage-breakdown', {
    handler: async (request, reply) => {
      const access = await requireCompanyAccess(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      try {
        const tire = await findTireForCompany(
          access.company.id,
          (request.params as { id: string }).id,
        );
        if (!tire) return sendNotFound(reply, request, 'Tire not found');

        const breakdown = await computeLiveUsageForTire(tire.id);
        if (!breakdown) return sendNotFound(reply, request, 'Tire not found');

        return reply.send({ data: breakdown });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to compute tire usage breakdown');
        return sendInternalError(reply, request, 'Failed to compute tire usage breakdown');
      }
    },
  });

  app.post('/:slug/tires', {
    handler: async (request, reply) => {
      const access = await requireFleetManagerOrMaintenance(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = tireCreateSchema.safeParse(request.body);
      if (!parsed.success) return sendValidationError(reply, request, parsed.error, 'Invalid tire');

      try {
        const depot = await findDepotById(access.company.id, parsed.data.depotId);
        if (!depot) return sendNotFound(reply, request, 'Depot not found');

        const tire = await createTire(access.company.id, parsed.data);
        await createAuditLog({
          action: 'TIRE_CREATED',
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          entityType: 'Tire',
          entityId: tire.id,
          details: JSON.stringify({ brand: tire.brand, model: tire.model }),
          ipAddress: request.ip,
        });
        reply.status(201);
        return reply.send({ data: tire });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to create tire');
        return sendInternalError(reply, request, 'Failed to create tire');
      }
    },
  });

  app.post('/:slug/tires/batch', {
    handler: async (request, reply) => {
      const access = await requireFleetManagerOrMaintenance(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = tireBatchCreateSchema.safeParse(request.body);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid tire batch');

      try {
        const depot = await findDepotById(access.company.id, parsed.data.depotId);
        if (!depot) return sendNotFound(reply, request, 'Depot not found');

        const tires = await createTiresBatch(access.company.id, parsed.data);
        await createAuditLog({
          action: 'TIRE_CREATED',
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          entityType: 'Tire',
          entityId: tires[0]?.id ?? '',
          details: JSON.stringify({
            brand: parsed.data.brand,
            model: parsed.data.model,
            count: tires.length,
          }),
          ipAddress: request.ip,
        });
        reply.status(201);
        return reply.send({ data: tires, meta: { created: tires.length } });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to create tire batch');
        return sendInternalError(reply, request, 'Failed to create tire batch');
      }
    },
  });

  app.patch('/:slug/tires/:id', {
    handler: async (request, reply) => {
      const access = await requireFleetManagerOrMaintenance(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = tireUpdateSchema.safeParse(request.body);
      if (!parsed.success) return sendValidationError(reply, request, parsed.error, 'Invalid tire');

      try {
        const tire = await findTireForCompany(
          access.company.id,
          (request.params as { id: string }).id,
        );
        if (!tire) return sendNotFound(reply, request, 'Tire not found');

        if (parsed.data.depotId) {
          const depot = await findDepotById(access.company.id, parsed.data.depotId);
          if (!depot) return sendNotFound(reply, request, 'Depot not found');
        }

        const updated = await updateTireMetadata(tire.id, parsed.data);
        await createAuditLog({
          action: 'TIRE_STATUS_CHANGED',
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          entityType: 'Tire',
          entityId: tire.id,
          details: JSON.stringify({ changedFields: Object.keys(parsed.data) }),
          ipAddress: request.ip,
        });
        return reply.send({ data: updated });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to update tire');
        return sendInternalError(reply, request, 'Failed to update tire');
      }
    },
  });

  app.post('/:slug/tires/:id/dispose', {
    handler: async (request, reply) => {
      const access = await requireFleetManagerOrMaintenance(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = disposeBodySchema.safeParse(request.body);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid dispose request');

      try {
        const tire = await findTireForCompany(
          access.company.id,
          (request.params as { id: string }).id,
        );
        if (!tire) return sendNotFound(reply, request, 'Tire not found');

        if (tire.status === 'MOUNTED') {
          // Don't auto-dismount — let the caller do it explicitly so the odometer is recorded
          return sendConflict(reply, request, 'Cannot dispose a mounted tire. Dismount it first.');
        }

        const disposed = await disposeTire({
          tireId: tire.id,
          performedById: access.session.user.id,
          date: parsed.data.date,
        });
        await createAuditLog({
          action: 'TIRE_DISPOSED',
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          entityType: 'Tire',
          entityId: tire.id,
          details: JSON.stringify({ brand: tire.brand, model: tire.model }),
          ipAddress: request.ip,
        });
        return reply.send({ data: disposed });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to dispose tire');
        return sendInternalError(reply, request, 'Failed to dispose tire');
      }
    },
  });
};
