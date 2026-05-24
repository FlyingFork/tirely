import type { FastifyInstance } from 'fastify';
import { mountTiresSchema, dismountTiresSchema, rotateTiresSchema } from '@tirely/validators';
import { requireFleetManagerOrMaintenance } from '../../../auth/auth.js';
import {
  sendBusinessError,
  sendInternalError,
  sendNotFound,
  sendValidationError,
} from '../../../lib/responses.js';
import { createAuditLog } from '../../../repositories/audit-log.repository.js';
import { findDepotById } from '../../../repositories/depot.repository.js';
import {
  mountTires,
  dismountTires,
  rotateTires,
} from '../../../repositories/mounting.repository.js';
import { getTireSetById } from '../../../repositories/tire-set.repository.js';
import { findVehicleByIdForCompany } from '../../../repositories/vehicle.repository.js';
import { validateFitment } from '../../../services/fitment.js';
import {
  recalculateUsageForTire,
  recalculateUsageForVehicle,
} from '../../../services/usage-algorithm/recalculate.js';

export const mountingRoutes = async (app: FastifyInstance) => {
  app.post('/:slug/vehicles/:vehicleId/mount', async (request, reply) => {
    const { slug, vehicleId } = request.params as { slug: string; vehicleId: string };
    const access = await requireFleetManagerOrMaintenance(request, reply, slug);
    if (!access) return;

    const vehicle = await findVehicleByIdForCompany(access.company.id, vehicleId);
    if (!vehicle) return sendNotFound(reply, request, 'Vehicle not found');

    const parsed = mountTiresSchema.safeParse(request.body);
    if (!parsed.success)
      return sendValidationError(reply, request, parsed.error, 'Invalid mount request');

    let assignments = parsed.data.assignments;

    if (parsed.data.tireSetId) {
      const tireSet = await getTireSetById(parsed.data.tireSetId, access.company.id);
      if (!tireSet) return sendNotFound(reply, request, 'Tire set not found');
      const posMap = parsed.data.positionMap ?? {};
      assignments = tireSet.tires
        .map((t) => ({ tireId: t.id, position: posMap[t.id] }))
        .filter(
          (
            a,
          ): a is {
            tireId: string;
            position: 'FRONT_LEFT' | 'FRONT_RIGHT' | 'REAR_LEFT' | 'REAR_RIGHT' | 'SPARE';
          } => Boolean(a.position),
        );
      if (assignments.length === 0) {
        return sendBusinessError(
          reply,
          request,
          'VALIDATION_ERROR',
          'positionMap must cover at least one tire in the set',
          400,
        );
      }
    }

    // Two-phase flow: first call returns mismatches with 409, client re-submits with confirmFitmentOverride
    const mismatches = await validateFitment({ vehicleId: vehicle.id, assignments });
    if (mismatches.length > 0 && !parsed.data.confirmFitmentOverride) {
      return sendBusinessError(
        reply,
        request,
        'FITMENT_OVERRIDE_REQUIRED',
        'One or more tires do not match the vehicle compatible sizes. Confirm override to proceed.',
        409,
        { mismatches },
      );
    }

    try {
      await mountTires({
        vehicleId: vehicle.id,
        performedById: access.session.user.id,
        date: parsed.data.date,
        odometer: parsed.data.odometer,
        assignments,
        fitmentOverride: mismatches.length > 0 && (parsed.data.confirmFitmentOverride ?? false),
        fitmentNote: parsed.data.fitmentNote ?? null,
      });
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('TIRE_NOT_AVAILABLE:')) {
        const tireId = err.message.split(':')[1];
        return sendBusinessError(
          reply,
          request,
          'TIRE_NOT_AVAILABLE',
          `Tire ${tireId} is not available for mounting (not IN_STOCK).`,
          409,
        );
      }
      app.log.error({ err, requestId: request.id }, 'Failed to mount tires');
      return sendInternalError(reply, request, 'Failed to mount tires');
    }

    if (mismatches.length > 0 && parsed.data.confirmFitmentOverride) {
      for (const m of mismatches) {
        await createAuditLog({
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          action: 'FITMENT_OVERRIDE',
          entityType: 'Tire',
          entityId: m.tireId,
          details: JSON.stringify({
            vehicleId: vehicle.id,
            position: m.position,
            expectedSizes: m.expectedSizes,
            actualSize: m.actualSize,
          }),
          ipAddress: request.ip,
        });
      }
    }

    await createAuditLog({
      actorUserId: access.session.user.id,
      companyId: access.company.id,
      action: 'TIRES_MOUNTED',
      entityType: 'Vehicle',
      entityId: vehicle.id,
      details: JSON.stringify({
        tireIds: assignments.map((assignment) => assignment.tireId),
        tireSetId: parsed.data.tireSetId ?? null,
        odometer: parsed.data.odometer,
        date: parsed.data.date,
      }),
      ipAddress: request.ip,
    });

    void recalculateUsageForVehicle(vehicle.id).catch((err) =>
      app.log.error({ err, vehicleId: vehicle.id }, 'Recalculate failed'),
    );

    return reply.send({ data: { ok: true } });
  });

  app.post('/:slug/vehicles/:vehicleId/dismount', async (request, reply) => {
    const { slug, vehicleId } = request.params as { slug: string; vehicleId: string };
    const access = await requireFleetManagerOrMaintenance(request, reply, slug);
    if (!access) return;

    const vehicle = await findVehicleByIdForCompany(access.company.id, vehicleId);
    if (!vehicle) return sendNotFound(reply, request, 'Vehicle not found');

    const parsed = dismountTiresSchema.safeParse(request.body);
    if (!parsed.success)
      return sendValidationError(reply, request, parsed.error, 'Invalid dismount request');

    const depot = await findDepotById(access.company.id, parsed.data.targetDepotId);
    if (!depot) return sendNotFound(reply, request, 'Target depot not found');

    try {
      await dismountTires({
        vehicleId: vehicle.id,
        performedById: access.session.user.id,
        date: parsed.data.date,
        odometer: parsed.data.odometer,
        tireIds: parsed.data.tireIds,
        reason: parsed.data.reason,
        targetDepotId: depot.id,
      });
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('TIRE_NOT_AVAILABLE:')) {
        const tireId = err.message.split(':')[1];
        return sendBusinessError(
          reply,
          request,
          'TIRE_NOT_AVAILABLE',
          `Tire ${tireId} is not mounted on this vehicle.`,
          409,
        );
      }
      app.log.error({ err, requestId: request.id }, 'Failed to dismount tires');
      return sendInternalError(reply, request, 'Failed to dismount tires');
    }

    void recalculateUsageForVehicle(vehicle.id).catch((err) =>
      app.log.error({ err, vehicleId: vehicle.id }, 'Recalculate failed'),
    );
    for (const tireId of parsed.data.tireIds) {
      void recalculateUsageForTire(tireId).catch((err) =>
        app.log.error({ err, tireId }, 'Recalculate failed for dismounted tire'),
      );
    }

    await createAuditLog({
      actorUserId: access.session.user.id,
      companyId: access.company.id,
      action: 'TIRES_DISMOUNTED',
      entityType: 'Vehicle',
      entityId: vehicle.id,
      details: JSON.stringify({
        tireIds: parsed.data.tireIds,
        reason: parsed.data.reason,
        targetDepotId: depot.id,
        odometer: parsed.data.odometer,
        date: parsed.data.date,
      }),
      ipAddress: request.ip,
    });

    return reply.send({ data: { ok: true } });
  });

  app.post('/:slug/vehicles/:vehicleId/rotate', async (request, reply) => {
    const { slug, vehicleId } = request.params as { slug: string; vehicleId: string };
    const access = await requireFleetManagerOrMaintenance(request, reply, slug);
    if (!access) return;

    const vehicle = await findVehicleByIdForCompany(access.company.id, vehicleId);
    if (!vehicle) return sendNotFound(reply, request, 'Vehicle not found');

    const parsed = rotateTiresSchema.safeParse(request.body);
    if (!parsed.success)
      return sendValidationError(reply, request, parsed.error, 'Invalid rotate request');

    const assignments = parsed.data.swaps.map((s) => ({
      tireId: s.tireId,
      position: s.newPosition,
    }));
    const mismatches = await validateFitment({ vehicleId: vehicle.id, assignments });
    if (mismatches.length > 0 && !parsed.data.confirmFitmentOverride) {
      return sendBusinessError(
        reply,
        request,
        'FITMENT_OVERRIDE_REQUIRED',
        'One or more tires do not match the vehicle compatible sizes at the new positions.',
        409,
        { mismatches },
      );
    }

    try {
      await rotateTires({
        vehicleId: vehicle.id,
        performedById: access.session.user.id,
        date: parsed.data.date,
        odometer: parsed.data.odometer,
        swaps: parsed.data.swaps,
        fitmentOverride: mismatches.length > 0 && (parsed.data.confirmFitmentOverride ?? false),
        fitmentNote: parsed.data.fitmentNote ?? null,
      });
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('TIRE_NOT_AVAILABLE:')) {
        const tireId = err.message.split(':')[1];
        return sendBusinessError(
          reply,
          request,
          'TIRE_NOT_AVAILABLE',
          `Tire ${tireId} is not mounted on this vehicle.`,
          409,
        );
      }
      app.log.error({ err, requestId: request.id }, 'Failed to rotate tires');
      return sendInternalError(reply, request, 'Failed to rotate tires');
    }

    if (mismatches.length > 0 && parsed.data.confirmFitmentOverride) {
      for (const m of mismatches) {
        await createAuditLog({
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          action: 'FITMENT_OVERRIDE',
          entityType: 'Tire',
          entityId: m.tireId,
          details: JSON.stringify({
            vehicleId: vehicle.id,
            position: m.position,
            expectedSizes: m.expectedSizes,
            actualSize: m.actualSize,
          }),
          ipAddress: request.ip,
        });
      }
    }

    void recalculateUsageForVehicle(vehicle.id).catch((err) =>
      app.log.error({ err, vehicleId: vehicle.id }, 'Recalculate failed'),
    );

    await createAuditLog({
      actorUserId: access.session.user.id,
      companyId: access.company.id,
      action: 'TIRES_ROTATED',
      entityType: 'Vehicle',
      entityId: vehicle.id,
      details: JSON.stringify({
        swaps: parsed.data.swaps,
        odometer: parsed.data.odometer,
        date: parsed.data.date,
      }),
      ipAddress: request.ip,
    });

    return reply.send({ data: { ok: true } });
  });
};
