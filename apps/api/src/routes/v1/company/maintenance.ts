import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  maintenanceCreateSchema,
  maintenanceListQuerySchema,
  type MaintenanceCreateInput,
} from '@tirely/validators';
import { requireCompanyAccess, requireFleetManagerOrMaintenance } from '../../../auth/auth.js';
import {
  sendBusinessError,
  sendInternalError,
  sendNotFound,
  sendValidationError,
} from '../../../lib/responses.js';
import { createAuditLog } from '../../../repositories/audit-log.repository.js';
import {
  createMaintenanceEvent,
  findMaintenanceEvent,
  listMaintenanceEvents,
  performRetreadingReturn,
} from '../../../repositories/maintenance.repository.js';
import { findVehicleByIdForCompany } from '../../../repositories/vehicle.repository.js';
import { recalculateUsageForTire } from '../../../services/usage-algorithm/recalculate.js';

type MaintenanceCreateData = MaintenanceCreateInput;

const mapEvent = (event: Awaited<ReturnType<typeof findMaintenanceEvent>>) => {
  if (!event) return null;
  return {
    id: event.id,
    vehicleId: event.vehicleId,
    performedBy: event.performedBy,
    type: event.type,
    date: event.date.toISOString(),
    description: event.description,
    cost: event.cost,
    tires: event.tires.map((t) => t.tire),
    createdAt: event.createdAt.toISOString(),
  };
};

function parseMaintenanceListQuery(request: { query: unknown }) {
  return maintenanceListQuerySchema.safeParse(request.query);
}

function parseMaintenanceCreateBody(request: { body: unknown }) {
  return maintenanceCreateSchema.safeParse(request.body);
}

function retreadingTirePayload(data: MaintenanceCreateData) {
  return (data.tireIds ?? []).map((tireId) => ({
    tireId,
    newTreadDepth: data.newTreadDepths![tireId] as number,
  }));
}

async function createMaintenanceFromPayload(input: {
  companyId: string;
  vehicleId: string;
  performedById: string;
  data: MaintenanceCreateData;
}) {
  if (input.data.type === 'RETREADING_RETURN') {
    return performRetreadingReturn({
      companyId: input.companyId,
      vehicleId: input.vehicleId,
      performedById: input.performedById,
      date: input.data.date,
      description: input.data.description,
      cost: input.data.cost,
      tires: retreadingTirePayload(input.data),
    });
  }

  return createMaintenanceEvent({
    companyId: input.companyId,
    vehicleId: input.vehicleId,
    performedById: input.performedById,
    type: input.data.type,
    date: input.data.date,
    description: input.data.description,
    cost: input.data.cost,
    tireIds: input.data.tireIds ?? [],
  });
}

function scheduleRetreadingRecalculation(
  app: FastifyInstance,
  data: MaintenanceCreateData,
) {
  if (data.type !== 'RETREADING_RETURN') return;

  for (const tireId of data.tireIds ?? []) {
    void recalculateUsageForTire(tireId).catch((recalcErr) =>
      app.log.error({ err: recalcErr, tireId }, 'Recalculate failed after retreading return'),
    );
  }
}

function sendMaintenanceBusinessError(
  reply: FastifyReply,
  request: FastifyRequest,
  message: string,
) {
  if (message.startsWith('RETREADING_LIMIT_REACHED:')) {
    return sendBusinessError(
      reply,
      request,
      'RETREADING_LIMIT_REACHED',
      'This tire has reached the maximum number of retreading cycles',
      409,
      { tireId: message.split(':')[1] },
    );
  }

  if (message.startsWith('TIRE_NOT_AVAILABLE:')) {
    return sendBusinessError(
      reply,
      request,
      'TIRE_NOT_AVAILABLE',
      'One or more tires are not in RETREADING status',
      409,
      { tireId: message.split(':')[1] },
    );
  }

  return null;
}

export const maintenanceRoutes = async (app: FastifyInstance) => {
  app.get('/:slug/maintenance', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const access = await requireCompanyAccess(request, reply, slug);
    if (!access) return;

    const parsed = parseMaintenanceListQuery(request);
    if (!parsed.success) return sendValidationError(reply, request, parsed.error, 'Invalid query');

    try {
      const result = await listMaintenanceEvents({ companyId: access.company.id, ...parsed.data });
      return reply.send({
        data: result.rows.map(mapEvent),
        meta: result.meta,
      });
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'Failed to list maintenance events');
      return sendInternalError(reply, request, 'Failed to list maintenance events');
    }
  });

  app.get('/:slug/maintenance/:id', async (request, reply) => {
    const { slug, id } = request.params as { slug: string; id: string };
    const access = await requireCompanyAccess(request, reply, slug);
    if (!access) return;

    try {
      const event = await findMaintenanceEvent(access.company.id, id);
      if (!event) return sendNotFound(reply, request, 'Maintenance event not found');
      return reply.send({ data: mapEvent(event) });
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'Failed to fetch maintenance event');
      return sendInternalError(reply, request, 'Failed to fetch maintenance event');
    }
  });

  app.post('/:slug/maintenance', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const access = await requireFleetManagerOrMaintenance(request, reply, slug);
    if (!access) return;

    const parsed = parseMaintenanceCreateBody(request);
    if (!parsed.success)
      return sendValidationError(reply, request, parsed.error, 'Invalid maintenance data');

    const vehicle = await findVehicleByIdForCompany(access.company.id, parsed.data.vehicleId);
    if (!vehicle) return sendNotFound(reply, request, 'Vehicle not found');

    try {
      const event = await createMaintenanceFromPayload({
        companyId: access.company.id,
        vehicleId: vehicle.id,
        performedById: access.session.user.id,
        data: parsed.data,
      });

      await createAuditLog({
        actorUserId: access.session.user.id,
        companyId: access.company.id,
        action: 'MAINTENANCE_LOGGED',
        entityType: 'MaintenanceEvent',
        entityId: event.id,
        details: JSON.stringify({ type: parsed.data.type, vehicleId: vehicle.id }),
        ipAddress: request.ip,
      });

      scheduleRetreadingRecalculation(app, parsed.data);

      reply.status(201);
      return reply.send({ data: mapEvent(event) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const businessReply = sendMaintenanceBusinessError(reply, request, msg);
      if (businessReply) return businessReply;

      app.log.error({ err, requestId: request.id }, 'Failed to create maintenance event');
      return sendInternalError(reply, request, 'Failed to create maintenance event');
    }
  });
};
