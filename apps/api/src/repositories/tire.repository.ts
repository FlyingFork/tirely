import { prisma } from '@tirely/database';
import type { Prisma } from '@tirely/database';
import type { TireBatchCreateInput, TireCreateInput, TireUpdateInput } from '@tirely/validators';

const TIRE_INCLUDE = {
  depot: { select: { id: true, name: true } },
} as const satisfies Prisma.TireInclude;

type TireRow = Prisma.TireGetPayload<{ include: typeof TIRE_INCLUDE }>;

export type TireWithRelations = TireRow & {
  currentVehicle: { id: string; licensePlate: string } | null;
};

export interface MountedTireRow {
  id: string;
  currentPosition: string | null;
  brand: string;
  model: string;
}

// Two-query approach: a JOIN here would bloat the include shape and break the satisfies check.
// Batches are small (perPage ≤ 100) so the extra round-trip is fine.
async function enrichWithVehicles(rows: TireRow[]): Promise<TireWithRelations[]> {
  const vehicleIds = [...new Set(rows.map((r) => r.currentVehicleId).filter(Boolean) as string[])];
  const vehicles =
    vehicleIds.length > 0
      ? await prisma.vehicle.findMany({
          where: { id: { in: vehicleIds } },
          select: { id: true, licensePlate: true },
        })
      : [];
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
  return rows.map((r) => ({
    ...r,
    currentVehicle: r.currentVehicleId ? (vehicleMap.get(r.currentVehicleId) ?? null) : null,
  }));
}

export const listTires = async (args: {
  companyId: string;
  page: number;
  perPage: number;
  search?: string;
  status?: 'IN_STOCK' | 'MOUNTED' | 'RETREADING' | 'DISPOSED';
  depotId?: string;
  minUsage?: number;
  maxUsage?: number;
  sortBy: 'createdAt' | 'usagePercentage' | 'brand';
  sortOrder: 'asc' | 'desc';
  archived?: boolean;
  vehicleId?: string;
}) => {
  const where: Prisma.TireWhereInput = {
    companyId: args.companyId,
    archived: args.archived ?? false,
    ...(args.status ? { status: args.status } : {}),
    ...(args.depotId ? { depotId: args.depotId } : {}),
    ...(args.search
      ? {
          OR: [
            { brand: { contains: args.search, mode: 'insensitive' } },
            { model: { contains: args.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(args.minUsage !== undefined || args.maxUsage !== undefined
      ? {
          usagePercentage: {
            ...(args.minUsage !== undefined ? { gte: args.minUsage } : {}),
            ...(args.maxUsage !== undefined ? { lte: args.maxUsage } : {}),
          },
        }
      : {}),
    ...(args.vehicleId ? { currentVehicleId: args.vehicleId } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.tire.findMany({
      where,
      orderBy: { [args.sortBy]: args.sortOrder },
      skip: (args.page - 1) * args.perPage,
      take: args.perPage,
      include: TIRE_INCLUDE,
    }),
    prisma.tire.count({ where }),
  ]);

  const enriched = await enrichWithVehicles(rows);
  return { rows: enriched, meta: { page: args.page, perPage: args.perPage, total } };
};

export const findTireForCompany = async (
  companyId: string,
  id: string,
): Promise<TireWithRelations | null> => {
  const tire = await prisma.tire.findFirst({
    where: { id, companyId },
    include: TIRE_INCLUDE,
  });
  if (!tire) return null;
  return (await enrichWithVehicles([tire]))[0]!;
};

export const listMountedTiresForVehicle = (vehicleId: string): Promise<MountedTireRow[]> =>
  prisma.tire.findMany({
    where: { currentVehicleId: vehicleId },
    select: {
      id: true,
      currentPosition: true,
      brand: true,
      model: true,
    },
  });

export const createTire = async (
  companyId: string,
  input: TireCreateInput,
): Promise<TireWithRelations> => {
  const tire = await prisma.$transaction(async (tx) => {
    const created = await tx.tire.create({
      data: {
        companyId,
        brand: input.brand,
        model: input.model,
        width: input.size.width,
        aspectRatio: input.size.aspectRatio,
        rimDiameter: input.size.rimDiameter,
        loadIndex: input.loadIndex ?? null,
        speedRating: input.speedRating ?? null,
        dotCode: input.dotCode ?? null,
        serialNumber: input.serialNumber ?? null,
        purchaseDate: input.purchaseDate,
        purchasePrice: input.purchasePrice ?? null,
        conditionNotes: input.conditionNotes ?? null,
        initialTreadDepth: input.initialTreadDepth,
        expectedMileageLifespan: input.expectedMileageLifespan ?? null,
        depotId: input.depotId,
        catalogModelId: input.catalogModelId ?? null,
        status: 'IN_STOCK',
      },
      include: TIRE_INCLUDE,
    });
    await tx.tireEvent.create({
      data: {
        tireId: created.id,
        eventType: 'PURCHASED',
        date: input.purchaseDate,
        lifecycleNumber: 1,
      },
    });
    return created;
  });
  return (await enrichWithVehicles([tire]))[0]!;
};

export const createTiresBatch = async (
  companyId: string,
  input: TireBatchCreateInput,
): Promise<TireWithRelations[]> => {
  const tires = await prisma.$transaction(async (tx) => {
    const created: TireRow[] = [];
    for (const unit of input.tires) {
      const tire = await tx.tire.create({
        data: {
          companyId,
          brand: input.brand,
          model: input.model,
          width: input.size.width,
          aspectRatio: input.size.aspectRatio,
          rimDiameter: input.size.rimDiameter,
          loadIndex: input.loadIndex ?? null,
          speedRating: input.speedRating ?? null,
          dotCode: unit.dotCode ?? null,
          serialNumber: unit.serialNumber ?? null,
          purchaseDate: unit.purchaseDate,
          purchasePrice: unit.purchasePrice ?? null,
          conditionNotes: unit.conditionNotes ?? null,
          initialTreadDepth: input.initialTreadDepth,
          expectedMileageLifespan: input.expectedMileageLifespan ?? null,
          depotId: input.depotId,
          catalogModelId: input.catalogModelId ?? null,
          status: 'IN_STOCK',
        },
        include: TIRE_INCLUDE,
      });
      await tx.tireEvent.create({
        data: {
          tireId: tire.id,
          eventType: 'PURCHASED',
          date: unit.purchaseDate,
          lifecycleNumber: 1,
        },
      });
      created.push(tire);
    }
    return created;
  });
  return enrichWithVehicles(tires);
};

export const updateTireMetadata = async (
  id: string,
  data: TireUpdateInput,
): Promise<TireWithRelations> => {
  const tire = await prisma.tire.update({ where: { id }, data, include: TIRE_INCLUDE });
  return (await enrichWithVehicles([tire]))[0]!;
};

export const disposeTire = async (input: {
  tireId: string;
  performedById: string;
  date: Date;
}): Promise<TireWithRelations> => {
  const tire = await prisma.$transaction(async (tx) => {
    const updated = await tx.tire.update({
      where: { id: input.tireId },
      data: { status: 'DISPOSED', archived: true, currentVehicleId: null, currentPosition: null },
      include: TIRE_INCLUDE,
    });
    await tx.tireEvent.create({
      data: {
        tireId: input.tireId,
        eventType: 'DISPOSED',
        performedById: input.performedById,
        date: input.date,
        lifecycleNumber: updated.currentLifecycleNumber,
      },
    });
    return updated;
  });
  return (await enrichWithVehicles([tire]))[0]!;
};
