import type { FastifyInstance } from 'fastify';
import { USER_ROLES } from '@tirely/types';
import { mileageEntryCreateSchema, mileageListQuerySchema } from '@tirely/validators';
import { requireCompanyAccess } from '../../../auth/auth.js';
import {
  sendBusinessError,
  sendForbidden,
  sendNotFound,
  sendValidationError,
} from '../../../lib/responses.js';
import { createAuditLog } from '../../../repositories/audit-log.repository.js';
import {
  createMileageEntry,
  findLatestMileage,
  listMileageEntries,
} from '../../../repositories/mileage.repository.js';
import { findVehicleByIdForCompany } from '../../../repositories/vehicle.repository.js';
import { recalculateUsageForVehicle } from '../../../services/usage-algorithm/recalculate.js';

export const mileageRoutes = async (app: FastifyInstance) => {
  app.get('/:slug/vehicles/:vehicleId/mileage', async (request, reply) => {
    const { slug, vehicleId } = request.params as { slug: string; vehicleId: string };
    const access = await requireCompanyAccess(request, reply, slug);
    if (!access) return;
    const vehicle = await findVehicleByIdForCompany(access.company.id, vehicleId);
    if (!vehicle) return sendNotFound(reply, request, 'Vehicle not found');
    const parsed = mileageListQuerySchema.safeParse(request.query);
    if (!parsed.success) return sendValidationError(reply, request, parsed.error, 'Invalid query');
    const result = await listMileageEntries({ vehicleId: vehicle.id, ...parsed.data });
    return { data: result.rows, meta: result.meta };
  });

  app.post('/:slug/vehicles/:vehicleId/mileage', async (request, reply) => {
    const { slug, vehicleId } = request.params as { slug: string; vehicleId: string };
    const access = await requireCompanyAccess(request, reply, slug);
    if (!access) return;
    const vehicle = await findVehicleByIdForCompany(access.company.id, vehicleId);
    if (!vehicle) return sendNotFound(reply, request, 'Vehicle not found');

    if (
      access.session.user.role === USER_ROLES.DRIVER &&
      vehicle.assignedDriverId !== access.session.user.id
    ) {
      return sendForbidden(reply, request, 'You can only log mileage on your assigned vehicle.');
    }

    const parsed = mileageEntryCreateSchema.safeParse(request.body);
    if (!parsed.success)
      return sendValidationError(reply, request, parsed.error, 'Invalid mileage entry');

    const latest = await findLatestMileage(vehicle.id);
    if (latest && parsed.data.odometer < latest.odometer) {
      return sendBusinessError(
        reply,
        request,
        'MILEAGE_REGRESSION',
        `Reading must be greater than the previous reading (${latest.odometer}).`,
        400,
        { previousOdometer: latest.odometer },
      );
    }

    const entry = await createMileageEntry({
      vehicleId: vehicle.id,
      recordedById: access.session.user.id,
      odometer: parsed.data.odometer,
      date: parsed.data.date,
    });

    void recalculateUsageForVehicle(vehicle.id).catch((err) =>
      app.log.error({ err, vehicleId: vehicle.id }, 'Recalculate failed'),
    );

    await createAuditLog({
      actorUserId: access.session.user.id,
      companyId: access.company.id,
      action: 'MILEAGE_LOGGED',
      entityType: 'Vehicle',
      entityId: vehicle.id,
      details: JSON.stringify({ odometer: entry.odometer, date: entry.date }),
      ipAddress: request.ip,
    });

    reply.status(201);
    return { data: entry };
  });
};
