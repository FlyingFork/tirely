import { prisma } from '@tirely/database';
import type { DismountReason } from '@tirely/database';

export const mountTires = (input: {
  vehicleId: string;
  performedById: string;
  date: Date;
  odometer: number;
  assignments: { tireId: string; position: string }[];
  fitmentOverride: boolean;
  fitmentNote: string | null;
}) =>
  prisma.$transaction(async (tx) => {
    const tires = await tx.tire.findMany({
      where: { id: { in: input.assignments.map((a) => a.tireId) } },
    });
    for (const t of tires) {
      // Error code is parsed by the route handler to return a typed 409 — keep the prefix format
      if (t.status !== 'IN_STOCK') throw new Error(`TIRE_NOT_AVAILABLE:${t.id}`);
    }
    for (const a of input.assignments) {
      const tire = tires.find((t) => t.id === a.tireId)!;
      await tx.tireEvent.create({
        data: {
          tireId: a.tireId,
          vehicleId: input.vehicleId,
          performedById: input.performedById,
          eventType: 'MOUNTED',
          position: a.position,
          odometerAt: input.odometer,
          date: input.date,
          fitmentOverride: input.fitmentOverride,
          fitmentNote: input.fitmentNote,
          lifecycleNumber: tire.currentLifecycleNumber,
        },
      });
      await tx.tire.update({
        where: { id: a.tireId },
        data: {
          status: 'MOUNTED',
          currentVehicleId: input.vehicleId,
          currentPosition: a.position,
          depotId: null,
        },
      });
    }
  });

export const dismountTires = (input: {
  vehicleId: string;
  performedById: string;
  date: Date;
  odometer: number;
  tireIds: string[];
  reason: DismountReason;
  targetDepotId: string;
}) =>
  prisma.$transaction(async (tx) => {
    const tires = await tx.tire.findMany({ where: { id: { in: input.tireIds } } });
    for (const t of tires) {
      if (t.status !== 'MOUNTED' || t.currentVehicleId !== input.vehicleId) {
        throw new Error(`TIRE_NOT_AVAILABLE:${t.id}`);
      }
    }
    for (const t of tires) {
      const newStatus = input.reason === 'SENT_FOR_RETREADING' ? 'RETREADING' : 'IN_STOCK';
      await tx.tireEvent.create({
        data: {
          tireId: t.id,
          vehicleId: input.vehicleId,
          performedById: input.performedById,
          eventType: 'DISMOUNTED',
          position: t.currentPosition!,
          odometerAt: input.odometer,
          date: input.date,
          dismountReason: input.reason,
          lifecycleNumber: t.currentLifecycleNumber,
        },
      });
      await tx.tire.update({
        where: { id: t.id },
        data: {
          status: newStatus,
          currentVehicleId: null,
          currentPosition: null,
          depotId: newStatus === 'IN_STOCK' ? input.targetDepotId : null,
        },
      });
    }
  });

export const rotateTires = (input: {
  vehicleId: string;
  performedById: string;
  date: Date;
  odometer: number;
  swaps: { tireId: string; newPosition: string }[];
  fitmentOverride: boolean;
  fitmentNote: string | null;
}) =>
  prisma.$transaction(async (tx) => {
    const tires = await tx.tire.findMany({
      where: { id: { in: input.swaps.map((s) => s.tireId) } },
    });
    for (const t of tires) {
      if (t.status !== 'MOUNTED' || t.currentVehicleId !== input.vehicleId) {
        throw new Error(`TIRE_NOT_AVAILABLE:${t.id}`);
      }
    }
    for (const s of input.swaps) {
      const tire = tires.find((t) => t.id === s.tireId)!;
      await tx.tireEvent.create({
        data: {
          tireId: s.tireId,
          vehicleId: input.vehicleId,
          performedById: input.performedById,
          eventType: 'ROTATED',
          position: s.newPosition,
          odometerAt: input.odometer,
          date: input.date,
          fitmentOverride: input.fitmentOverride,
          fitmentNote: input.fitmentNote,
          lifecycleNumber: tire.currentLifecycleNumber,
        },
      });
      await tx.tire.update({ where: { id: s.tireId }, data: { currentPosition: s.newPosition } });
    }
  });
