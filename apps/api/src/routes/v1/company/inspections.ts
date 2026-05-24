import type { FastifyInstance } from 'fastify';
import { USER_ROLES } from '@tirely/types';
import {
  dailyInspectionSchema,
  detailedInspectionSchema,
  inspectionListQuerySchema,
} from '@tirely/validators';
import { requireCompanyAccess, requireFleetManagerOrMaintenance } from '../../../auth/auth.js';
import {
  sendBusinessError,
  sendForbidden,
  sendInternalError,
  sendNotFound,
  sendValidationError,
} from '../../../lib/responses.js';
import { createAuditLog } from '../../../repositories/audit-log.repository.js';
import {
  createDailyInspection,
  createDetailedInspection,
  findInspectionForCompany,
  listInspections,
} from '../../../repositories/inspection.repository.js';
import { findVehicleByIdForCompany } from '../../../repositories/vehicle.repository.js';
import { findLatestMileage } from '../../../repositories/mileage.repository.js';
import { recalculateUsageForVehicle } from '../../../services/usage-algorithm/recalculate.js';
import { listMountedTiresForVehicle } from '../../../repositories/tire.repository.js';

export const inspectionRoutes = async (app: FastifyInstance) => {
  app.get('/:slug/inspections', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const access = await requireCompanyAccess(request, reply, slug);
    if (!access) return;

    const parsed = inspectionListQuerySchema.safeParse(request.query);
    if (!parsed.success) return sendValidationError(reply, request, parsed.error, 'Invalid query');

    try {
      const result = await listInspections({ companyId: access.company.id, ...parsed.data });
      return reply.send({
        data: result.rows.map((r) => ({
          id: r.id,
          vehicleId: r.vehicleId,
          vehicle: r.vehicle,
          inspector: r.inspector,
          type: r.type,
          date: r.date.toISOString(),
          createdAt: r.createdAt.toISOString(),
          resultCount: r.tireResults.length,
          concernCount: r.tireResults.filter(
            (t) =>
              t.visualCondition === 'CONCERN' ||
              t.condition === 'NEEDS_MONITORING' ||
              t.condition === 'NEEDS_REPLACEMENT',
          ).length,
        })),
        meta: result.meta,
      });
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'Failed to list inspections');
      return sendInternalError(reply, request, 'Failed to list inspections');
    }
  });

  app.get('/:slug/inspections/:id', async (request, reply) => {
    const { slug, id } = request.params as { slug: string; id: string };
    const access = await requireCompanyAccess(request, reply, slug);
    if (!access) return;

    try {
      const inspection = await findInspectionForCompany(access.company.id, id);
      if (!inspection) return sendNotFound(reply, request, 'Inspection not found');

      return reply.send({
        data: {
          id: inspection.id,
          vehicleId: inspection.vehicleId,
          vehicle: inspection.vehicle,
          inspector: inspection.inspector,
          type: inspection.type,
          date: inspection.date.toISOString(),
          overallNotes: inspection.overallNotes,
          createdAt: inspection.createdAt.toISOString(),
          results: inspection.tireResults.map((r) => ({
            id: r.id,
            tireId: r.tireId,
            position: r.position,
            visualCondition: r.visualCondition,
            treadDepth: r.treadDepth,
            tirePressure: r.tirePressure,
            damageNotes: r.damageNotes,
            condition: r.condition,
            anomalyNotes: r.anomalyNotes,
          })),
        },
      });
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'Failed to fetch inspection');
      return sendInternalError(reply, request, 'Failed to fetch inspection');
    }
  });

  app.post('/:slug/inspections/daily', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const access = await requireCompanyAccess(request, reply, slug);
    if (!access) return;

    const parsed = dailyInspectionSchema.safeParse(request.body);
    if (!parsed.success)
      return sendValidationError(reply, request, parsed.error, 'Invalid inspection data');

    const vehicle = await findVehicleByIdForCompany(access.company.id, parsed.data.vehicleId);
    if (!vehicle) return sendNotFound(reply, request, 'Vehicle not found');

    // Drivers can only inspect their own assigned vehicle; fleet managers/maintenance can inspect any
    if (
      access.session.user.role === USER_ROLES.DRIVER &&
      vehicle.assignedDriverId !== access.session.user.id
    ) {
      return sendForbidden(
        reply,
        request,
        'You can only submit inspections on your assigned vehicle',
      );
    }

    const mountedTires = await listMountedTiresForVehicle(vehicle.id);

    if (mountedTires.length === 0) {
      return sendBusinessError(
        reply,
        request,
        'VALIDATION_ERROR',
        'This vehicle has no mounted tires',
        422,
      );
    }

    const mountedTireIds = new Set(mountedTires.map((t) => t.id));
    const invalidTireIds = parsed.data.results.filter((r) => !mountedTireIds.has(r.tireId));
    if (invalidTireIds.length > 0) {
      return sendBusinessError(
        reply,
        request,
        'VALIDATION_ERROR',
        'One or more tires are not currently mounted on this vehicle',
        422,
        { invalidTireIds: invalidTireIds.map((r) => r.tireId) },
      );
    }

    const mountedTireMap = new Map(mountedTires.map((t) => [t.id, t.currentPosition ?? '']));

    try {
      const inspection = await createDailyInspection({
        companyId: access.company.id,
        vehicleId: vehicle.id,
        inspectorId: access.session.user.id,
        date: parsed.data.date,
        overallNotes: parsed.data.overallNotes,
        results: parsed.data.results.map((r) => ({
          tireId: r.tireId,
          position: mountedTireMap.get(r.tireId) ?? '',
          visualCondition: r.visualCondition,
          anomalyNotes: r.anomalyNotes,
        })),
      });

      await createAuditLog({
        actorUserId: access.session.user.id,
        companyId: access.company.id,
        action: 'INSPECTION_COMPLETED',
        entityType: 'Inspection',
        entityId: inspection.id,
        details: JSON.stringify({
          type: 'DAILY_CHECK',
          vehicleId: vehicle.id,
          resultCount: inspection.tireResults.length,
        }),
        ipAddress: request.ip,
      });

      reply.status(201);
      return reply.send({ data: inspection });
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'Failed to create daily inspection');
      return sendInternalError(reply, request, 'Failed to create inspection');
    }
  });

  app.post('/:slug/inspections/detailed', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const access = await requireFleetManagerOrMaintenance(request, reply, slug);
    if (!access) return;

    const parsed = detailedInspectionSchema.safeParse(request.body);
    if (!parsed.success)
      return sendValidationError(reply, request, parsed.error, 'Invalid inspection data');

    const vehicle = await findVehicleByIdForCompany(access.company.id, parsed.data.vehicleId);
    if (!vehicle) return sendNotFound(reply, request, 'Vehicle not found');

    const mountedTires = await listMountedTiresForVehicle(vehicle.id);

    if (mountedTires.length === 0) {
      return sendBusinessError(
        reply,
        request,
        'VALIDATION_ERROR',
        'This vehicle has no mounted tires',
        422,
      );
    }

    const mountedTireIds = new Set(mountedTires.map((t) => t.id));
    const invalidTireIds = parsed.data.results.filter((r) => !mountedTireIds.has(r.tireId));
    if (invalidTireIds.length > 0) {
      return sendBusinessError(
        reply,
        request,
        'VALIDATION_ERROR',
        'One or more tires are not currently mounted on this vehicle',
        422,
        { invalidTireIds: invalidTireIds.map((r) => r.tireId) },
      );
    }

    const mountedTireMap = new Map(mountedTires.map((t) => [t.id, t.currentPosition ?? '']));

    const latestMileage = await findLatestMileage(vehicle.id);
    const vehicleOdometer = latestMileage?.odometer ?? 0;

    try {
      const inspection = await createDetailedInspection({
        companyId: access.company.id,
        vehicleId: vehicle.id,
        inspectorId: access.session.user.id,
        date: parsed.data.date,
        overallNotes: parsed.data.overallNotes,
        vehicleOdometer,
        results: parsed.data.results.map((r) => ({
          tireId: r.tireId,
          position: mountedTireMap.get(r.tireId) ?? '',
          treadDepth: r.treadDepth,
          tirePressure: r.tirePressure,
          damageNotes: r.damageNotes,
          condition: r.condition,
        })),
      });

      void recalculateUsageForVehicle(vehicle.id).catch((err) =>
        app.log.error({ err, vehicleId: vehicle.id }, 'Recalculate failed'),
      );

      await createAuditLog({
        actorUserId: access.session.user.id,
        companyId: access.company.id,
        action: 'INSPECTION_COMPLETED',
        entityType: 'Inspection',
        entityId: inspection.id,
        details: JSON.stringify({
          type: 'DETAILED',
          vehicleId: vehicle.id,
          resultCount: inspection.tireResults.length,
        }),
        ipAddress: request.ip,
      });

      reply.status(201);
      return reply.send({ data: inspection });
    } catch (err) {
      app.log.error({ err, requestId: request.id }, 'Failed to create detailed inspection');
      return sendInternalError(reply, request, 'Failed to create inspection');
    }
  });
};
