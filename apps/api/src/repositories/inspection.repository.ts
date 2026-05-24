import { prisma } from '@tirely/database';
import type { Prisma, TireCondition, TireConditionDetailed } from '@tirely/database';

// List view omits the tire sub-relation (not needed for the table).
// Detail view loads it for the full inspection breakdown screen.
const INSPECTION_INCLUDE = {
  tireResults: true,
  inspector: { select: { id: true, name: true } },
  vehicle: { select: { id: true, licensePlate: true, make: true, model: true } },
} as const satisfies Prisma.InspectionInclude;

const INSPECTION_DETAIL_INCLUDE = {
  tireResults: {
    include: { tire: { select: { id: true, brand: true, model: true } } },
  },
  inspector: { select: { id: true, name: true } },
  vehicle: { select: { id: true, licensePlate: true, make: true, model: true } },
} as const satisfies Prisma.InspectionInclude;

export type InspectionWithRelations = Prisma.InspectionGetPayload<{
  include: typeof INSPECTION_INCLUDE;
}>;

export type InspectionDetail = Prisma.InspectionGetPayload<{
  include: typeof INSPECTION_DETAIL_INCLUDE;
}>;

export const createDailyInspection = (input: {
  companyId: string;
  vehicleId: string;
  inspectorId: string;
  date: Date;
  overallNotes?: string;
  results: {
    tireId: string;
    position: string;
    visualCondition: TireCondition;
    anomalyNotes?: string;
  }[];
}) =>
  prisma.$transaction(async (tx) => {
    return tx.inspection.create({
      data: {
        companyId: input.companyId,
        vehicleId: input.vehicleId,
        inspectorId: input.inspectorId,
        type: 'DAILY_CHECK',
        date: input.date,
        overallNotes: input.overallNotes ?? null,
        tireResults: {
          create: input.results.map((r) => ({
            tireId: r.tireId,
            position: r.position,
            visualCondition: r.visualCondition,
            anomalyNotes: r.anomalyNotes ?? null,
          })),
        },
      },
      include: INSPECTION_INCLUDE,
    });
  });

export const createDetailedInspection = (input: {
  companyId: string;
  vehicleId: string;
  inspectorId: string;
  date: Date;
  overallNotes?: string;
  vehicleOdometer: number;
  results: {
    tireId: string;
    position: string;
    treadDepth: number;
    tirePressure?: number;
    damageNotes?: string;
    condition: TireConditionDetailed;
  }[];
}) =>
  prisma.$transaction(async (tx) => {
    const inspection = await tx.inspection.create({
      data: {
        companyId: input.companyId,
        vehicleId: input.vehicleId,
        inspectorId: input.inspectorId,
        type: 'DETAILED',
        date: input.date,
        overallNotes: input.overallNotes ?? null,
        tireResults: {
          create: input.results.map((r) => ({
            tireId: r.tireId,
            position: r.position,
            treadDepth: r.treadDepth,
            tirePressure: r.tirePressure ?? null,
            damageNotes: r.damageNotes ?? null,
            condition: r.condition,
          })),
        },
      },
      include: INSPECTION_INCLUDE,
    });

    for (const r of input.results) {
      await tx.tire.update({
        where: { id: r.tireId },
        data: {
          latestTreadDepth: r.treadDepth,
          latestCondition: r.condition,
          latestInspectionDate: input.date,
          mileageAtLastInspection: input.vehicleOdometer,
        },
      });
    }
    return inspection;
  });

export const listInspections = async (args: {
  companyId: string;
  page: number;
  perPage: number;
  vehicleId?: string;
  type?: 'DAILY_CHECK' | 'DETAILED';
  inspectorId?: string;
  fromDate?: Date;
  toDate?: Date;
}) => {
  const where: Prisma.InspectionWhereInput = {
    companyId: args.companyId,
    ...(args.vehicleId && { vehicleId: args.vehicleId }),
    ...(args.type && { type: args.type }),
    ...(args.inspectorId && { inspectorId: args.inspectorId }),
    ...(args.fromDate || args.toDate
      ? {
          date: {
            ...(args.fromDate && { gte: args.fromDate }),
            ...(args.toDate && { lte: args.toDate }),
          },
        }
      : {}),
  };

  const skip = (args.page - 1) * args.perPage;

  const [rows, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      orderBy: { date: 'desc' },
      skip,
      take: args.perPage,
      include: {
        inspector: { select: { id: true, name: true } },
        vehicle: { select: { id: true, licensePlate: true, make: true, model: true } },
        tireResults: { select: { id: true, visualCondition: true, condition: true } },
      },
    }),
    prisma.inspection.count({ where }),
  ]);

  return {
    rows,
    meta: { page: args.page, perPage: args.perPage, total },
  };
};

export const findInspectionForCompany = (
  companyId: string,
  id: string,
): Promise<InspectionDetail | null> =>
  prisma.inspection.findFirst({
    where: { id, companyId },
    include: INSPECTION_DETAIL_INCLUDE,
  });
