import {
  vehicleCompatibleSizeSchema,
  vehicleCreateSchema,
  vehicleListQuerySchema,
  vehicleUpdateSchema,
} from '@tirely/validators';
import type { ApiVehicleCompatibleSize } from '@tirely/types';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';

import { requireCompanyAccess, requireFleetManager } from '../../../auth/auth.js';
import {
  sendConflict,
  sendForbidden,
  sendInternalError,
  sendNotFound,
  sendValidationError,
} from '../../../lib/responses.js';
import { createAuditLog } from '../../../repositories/audit-log.repository.js';
import { findDepotById } from '../../../repositories/depot.repository.js';
import { listMountedTiresForVehicle } from '../../../repositories/tire.repository.js';
import { findUserByIdForCompany } from '../../../repositories/user.repository.js';
import {
  assignDriver,
  createVehicle,
  findVehicleByIdForCompany,
  listVehicles,
  replaceCompatibleSizes,
  setVehicleArchived,
  updateVehicleMetadata,
  type VehicleWithRelations,
} from '../../../repositories/vehicle.repository.js';

const mapVehicle = (v: VehicleWithRelations) => ({
  ...v,
  createdAt: v.createdAt.toISOString(),
  updatedAt: v.updatedAt.toISOString(),
  vehicleCompatibleSizes: undefined,
  compatibleSizes: v.vehicleCompatibleSizes.map((s) => ({
    ...s,
    axlePosition: (s.axlePosition ?? 'ANY') as ApiVehicleCompatibleSize['axlePosition'],
  })),
});

const archiveBodySchema = z.object({ archived: z.boolean() });
const compatibleSizesBodySchema = z.object({
  sizes: z.array(vehicleCompatibleSizeSchema).min(1).max(20),
});
const driverBodySchema = z.object({ driverId: z.string().min(1).nullable() });

const isP2002 = (err: unknown) =>
  err !== null &&
  typeof err === 'object' &&
  'code' in err &&
  (err as { code: string }).code === 'P2002';

export const vehicleRoutes = async (app: FastifyInstance) => {
  app.get('/:slug/vehicles', {
    handler: async (request, reply) => {
      const access = await requireCompanyAccess(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = vehicleListQuerySchema.safeParse(request.query);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid query');

      try {
        const result = await listVehicles({ companyId: access.company.id, ...parsed.data });
        return reply.send({ data: result.rows, meta: result.meta });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to list vehicles');
        return sendInternalError(reply, request, 'Failed to list vehicles');
      }
    },
  });

  app.get('/:slug/vehicles/:id', {
    handler: async (request, reply) => {
      const access = await requireCompanyAccess(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      try {
        const vehicle = await findVehicleByIdForCompany(
          access.company.id,
          (request.params as { id: string }).id,
        );
        if (!vehicle) return sendNotFound(reply, request, 'Vehicle not found');
        return reply.send({ data: mapVehicle(vehicle) });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to fetch vehicle');
        return sendInternalError(reply, request, 'Failed to fetch vehicle');
      }
    },
  });

  app.post('/:slug/vehicles', {
    handler: async (request, reply) => {
      const access = await requireFleetManager(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = vehicleCreateSchema.safeParse(request.body);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid vehicle data');

      try {
        const depot = await findDepotById(access.company.id, parsed.data.depotId);
        if (!depot) return sendNotFound(reply, request, 'Depot not found');

        if (parsed.data.assignedDriverId) {
          const driver = await findUserByIdForCompany(
            access.company.id,
            parsed.data.assignedDriverId,
          );
          if (!driver) return sendNotFound(reply, request, 'Driver not found');
          if (driver.role !== 'driver')
            return sendForbidden(reply, request, 'User is not a driver');
        }

        const vehicle = await createVehicle(access.company.id, parsed.data);
        await createAuditLog({
          action: 'VEHICLE_CREATED',
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          entityType: 'Vehicle',
          entityId: vehicle.id,
          details: JSON.stringify({ licensePlate: vehicle.licensePlate }),
          ipAddress: request.ip,
        });
        reply.status(201);
        return reply.send({ data: mapVehicle(vehicle) });
      } catch (err) {
        if (isP2002(err)) {
          return sendConflict(reply, request, 'A vehicle with this license plate already exists');
        }
        app.log.error({ err, requestId: request.id }, 'Failed to create vehicle');
        return sendInternalError(reply, request, 'Failed to create vehicle');
      }
    },
  });

  app.patch('/:slug/vehicles/:id', {
    handler: async (request, reply) => {
      const access = await requireFleetManager(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = vehicleUpdateSchema.safeParse(request.body);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid vehicle data');

      try {
        const vehicle = await findVehicleByIdForCompany(
          access.company.id,
          (request.params as { id: string }).id,
        );
        if (!vehicle) return sendNotFound(reply, request, 'Vehicle not found');

        if (parsed.data.depotId && parsed.data.depotId !== vehicle.depotId) {
          const depot = await findDepotById(access.company.id, parsed.data.depotId);
          if (!depot) return sendNotFound(reply, request, 'Depot not found');
        }

        const updated = await updateVehicleMetadata(vehicle.id, parsed.data);
        await createAuditLog({
          action: 'VEHICLE_UPDATED',
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          entityType: 'Vehicle',
          entityId: vehicle.id,
          details: JSON.stringify({ changedFields: Object.keys(parsed.data) }),
          ipAddress: request.ip,
        });
        return reply.send({ data: mapVehicle(updated) });
      } catch (err) {
        if (isP2002(err)) {
          return sendConflict(reply, request, 'A vehicle with this license plate already exists');
        }
        app.log.error({ err, requestId: request.id }, 'Failed to update vehicle');
        return sendInternalError(reply, request, 'Failed to update vehicle');
      }
    },
  });

  app.patch('/:slug/vehicles/:id/archive', {
    handler: async (request, reply) => {
      const access = await requireFleetManager(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = archiveBodySchema.safeParse(request.body);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid request');

      try {
        const vehicle = await findVehicleByIdForCompany(
          access.company.id,
          (request.params as { id: string }).id,
        );
        if (!vehicle) return sendNotFound(reply, request, 'Vehicle not found');

        const updated = await setVehicleArchived(vehicle.id, parsed.data.archived);
        await createAuditLog({
          action: parsed.data.archived ? 'VEHICLE_ARCHIVED' : 'VEHICLE_UPDATED',
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          entityType: 'Vehicle',
          entityId: vehicle.id,
          ipAddress: request.ip,
        });
        return reply.send({ data: mapVehicle(updated) });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to archive vehicle');
        return sendInternalError(reply, request, 'Failed to archive vehicle');
      }
    },
  });

  app.put('/:slug/vehicles/:id/compatible-sizes', {
    handler: async (request, reply) => {
      const access = await requireFleetManager(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = compatibleSizesBodySchema.safeParse(request.body);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid sizes');

      try {
        const vehicle = await findVehicleByIdForCompany(
          access.company.id,
          (request.params as { id: string }).id,
        );
        if (!vehicle) return sendNotFound(reply, request, 'Vehicle not found');

        const updated = await replaceCompatibleSizes(vehicle.id, parsed.data.sizes);
        await createAuditLog({
          action: 'VEHICLE_COMPATIBLE_SIZES_UPDATED',
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          entityType: 'Vehicle',
          entityId: vehicle.id,
          ipAddress: request.ip,
        });
        return reply.send({ data: mapVehicle(updated).compatibleSizes });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to update compatible sizes');
        return sendInternalError(reply, request, 'Failed to update compatible sizes');
      }
    },
  });

  app.patch('/:slug/vehicles/:id/driver', {
    handler: async (request, reply) => {
      const access = await requireFleetManager(
        request,
        reply,
        (request.params as { slug: string }).slug,
      );
      if (!access) return;

      const parsed = driverBodySchema.safeParse(request.body);
      if (!parsed.success)
        return sendValidationError(reply, request, parsed.error, 'Invalid request');

      try {
        const vehicle = await findVehicleByIdForCompany(
          access.company.id,
          (request.params as { id: string }).id,
        );
        if (!vehicle) return sendNotFound(reply, request, 'Vehicle not found');

        if (parsed.data.driverId !== null) {
          const driver = await findUserByIdForCompany(access.company.id, parsed.data.driverId);
          if (!driver) return sendNotFound(reply, request, 'Driver not found');
          if (driver.role !== 'driver')
            return sendForbidden(reply, request, 'User is not a driver');
        }

        const updated = await assignDriver(vehicle.id, parsed.data.driverId);
        await createAuditLog({
          action: parsed.data.driverId ? 'VEHICLE_DRIVER_ASSIGNED' : 'VEHICLE_DRIVER_UNASSIGNED',
          actorUserId: access.session.user.id,
          companyId: access.company.id,
          entityType: 'Vehicle',
          entityId: vehicle.id,
          details: parsed.data.driverId
            ? JSON.stringify({ driverId: parsed.data.driverId })
            : undefined,
          ipAddress: request.ip,
        });
        return reply.send({ data: { id: updated.id, assignedDriverId: updated.assignedDriverId } });
      } catch (err) {
        if (isP2002(err)) {
          return sendConflict(reply, request, 'This driver is already assigned to another vehicle');
        }
        app.log.error({ err, requestId: request.id }, 'Failed to assign driver');
        return sendInternalError(reply, request, 'Failed to assign driver');
      }
    },
  });

  app.get('/:slug/vehicles/:vehicleId/mounted-tires', {
    handler: async (request, reply) => {
      const { slug, vehicleId } = request.params as { slug: string; vehicleId: string };
      const access = await requireCompanyAccess(request, reply, slug);
      if (!access) return;

      const vehicle = await findVehicleByIdForCompany(access.company.id, vehicleId);
      if (!vehicle) return sendNotFound(reply, request, 'Vehicle not found');

      try {
        const tires = await listMountedTiresForVehicle(vehicle.id);

        return reply.send({
          data: tires.map((t) => ({
            tireId: t.id,
            position: t.currentPosition ?? '',
            brand: t.brand,
            model: t.model,
          })),
        });
      } catch (err) {
        app.log.error({ err, requestId: request.id }, 'Failed to fetch mounted tires');
        return sendInternalError(reply, request, 'Failed to fetch mounted tires');
      }
    },
  });
};
