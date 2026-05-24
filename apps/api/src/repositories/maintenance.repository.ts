import { prisma } from '@tirely/database';
import type { MaintenanceType, Prisma } from '@tirely/database';

const MAINTENANCE_INCLUDE = {
  tires: { include: { tire: { select: { id: true, brand: true, model: true } } } },
  performedBy: { select: { id: true, name: true } },
} as const satisfies Prisma.MaintenanceEventInclude;

export interface ListMaintenanceArgs {
  companyId: string;
  page: number;
  perPage: number;
  vehicleId?: string;
  type?: MaintenanceType;
  fromDate?: Date;
  toDate?: Date;
}

export const listMaintenanceEvents = async (args: ListMaintenanceArgs) => {
  const where: Prisma.MaintenanceEventWhereInput = {
    companyId: args.companyId,
    ...(args.vehicleId ? { vehicleId: args.vehicleId } : {}),
    ...(args.type ? { type: args.type } : {}),
    ...(args.fromDate || args.toDate
      ? {
          date: {
            ...(args.fromDate ? { gte: args.fromDate } : {}),
            ...(args.toDate ? { lte: args.toDate } : {}),
          },
        }
      : {}),
  };

  const skip = (args.page - 1) * args.perPage;
  const [rows, total] = await Promise.all([
    prisma.maintenanceEvent.findMany({
      where,
      include: MAINTENANCE_INCLUDE,
      orderBy: { date: 'desc' },
      skip,
      take: args.perPage,
    }),
    prisma.maintenanceEvent.count({ where }),
  ]);

  return { rows, meta: { page: args.page, perPage: args.perPage, total } };
};

export const findMaintenanceEvent = async (companyId: string, id: string) =>
  prisma.maintenanceEvent.findUnique({
    where: { id, companyId },
    include: MAINTENANCE_INCLUDE,
  });

export const createMaintenanceEvent = (input: {
  companyId: string;
  vehicleId: string;
  performedById: string;
  type: MaintenanceType;
  date: Date;
  description?: string;
  cost?: number;
  tireIds: string[];
}) =>
  prisma.maintenanceEvent.create({
    data: {
      companyId: input.companyId,
      vehicleId: input.vehicleId,
      performedById: input.performedById,
      type: input.type,
      date: input.date,
      description: input.description ?? null,
      cost: input.cost ?? null,
      tires: { create: input.tireIds.map((tireId) => ({ tireId })) },
    },
    include: MAINTENANCE_INCLUDE,
  });

export const performRetreadingReturn = (input: {
  companyId: string;
  vehicleId: string;
  performedById: string;
  date: Date;
  description?: string;
  cost?: number;
  tires: { tireId: string; newTreadDepth: number }[];
}) =>
  prisma.$transaction(async (tx) => {
    const settings =
      (await tx.companySettings.findUnique({ where: { companyId: input.companyId } })) ??
      (await tx.companySettings.create({ data: { companyId: input.companyId } }));

    const event = await tx.maintenanceEvent.create({
      data: {
        companyId: input.companyId,
        vehicleId: input.vehicleId,
        performedById: input.performedById,
        type: 'RETREADING_RETURN',
        date: input.date,
        description: input.description ?? null,
        cost: input.cost ?? null,
        tires: { create: input.tires.map((t) => ({ tireId: t.tireId })) },
      },
      include: MAINTENANCE_INCLUDE,
    });

    for (const t of input.tires) {
      const tire = await tx.tire.findUnique({ where: { id: t.tireId } });
      if (!tire) throw new Error('TIRE_NOT_FOUND');
      if (tire.status !== 'RETREADING') throw new Error(`TIRE_NOT_AVAILABLE:${t.tireId}`);

      const newCycle = tire.currentLifecycleNumber + 1;
      if (tire.currentLifecycleNumber >= settings.maxRetreadingCycles) {
        throw new Error(`RETREADING_LIMIT_REACHED:${t.tireId}`);
      }

      // Each retreading cycle reduces expected lifespan by the configured percentage
      const baseLifespan = tire.expectedMileageLifespan ?? settings.defaultExpectedMileage;
      const reducedLifespan = Math.round(baseLifespan * (1 - settings.retreadingLifespanReduction));

      await tx.tireEvent.create({
        data: {
          tireId: t.tireId,
          eventType: 'RETURNED_FROM_RETREADING',
          performedById: input.performedById,
          date: input.date,
          newTreadDepth: t.newTreadDepth,
          lifecycleNumber: newCycle,
        },
      });

      await tx.tire.update({
        where: { id: t.tireId },
        data: {
          status: 'IN_STOCK',
          retreadingCount: tire.retreadingCount + 1,
          currentLifecycleNumber: newCycle,
          currentLifecycleStartDate: input.date,
          initialTreadDepth: t.newTreadDepth,
          expectedMileageLifespan: reducedLifespan,
          accumulatedMileage: 0,
          mileageAtLastInspection: 0,
          latestTreadDepth: t.newTreadDepth,
          latestCondition: 'GOOD',
          latestInspectionDate: input.date,
          usagePercentage: 0,
          usageStatus: 'GOOD',
          usageIsEstimated: false,
          usageCalculatedAt: input.date,
        },
      });
    }

    return event;
  });
