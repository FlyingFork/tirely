import { prisma } from '@tirely/database';
import type { Prisma } from '@tirely/database';
import type { VehicleCompatibleSizeInput, VehicleCreateInput } from '@tirely/validators';

const VEHICLE_INCLUDE = {
  depot: { select: { id: true, name: true } },
  assignedDriver: { select: { id: true, name: true, email: true } },
  vehicleCompatibleSizes: true,
} as const satisfies Prisma.VehicleInclude;

export type VehicleWithRelations = Prisma.VehicleGetPayload<{ include: typeof VEHICLE_INCLUDE }>;

export const listVehicles = async (args: {
  companyId: string;
  page: number;
  perPage: number;
  search?: string;
  depotId?: string;
  driverAssigned?: boolean;
  archived?: boolean;
  sortBy: 'licensePlate' | 'make' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}) => {
  const where: Prisma.VehicleWhereInput = {
    companyId: args.companyId,
    ...(args.archived !== undefined ? { archived: args.archived } : {}),
    ...(args.depotId ? { depotId: args.depotId } : {}),
    ...(args.driverAssigned !== undefined
      ? args.driverAssigned
        ? { assignedDriverId: { not: null } }
        : { assignedDriverId: null }
      : {}),
    ...(args.search
      ? {
          OR: [
            { licensePlate: { contains: args.search, mode: 'insensitive' } },
            { make: { contains: args.search, mode: 'insensitive' } },
            { model: { contains: args.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy: { [args.sortBy]: args.sortOrder },
      skip: (args.page - 1) * args.perPage,
      take: args.perPage,
      include: {
        depot: { select: { id: true, name: true } },
        assignedDriver: { select: { id: true, name: true, email: true } },
        _count: { select: { vehicleCompatibleSizes: true } },
      },
    }),
    prisma.vehicle.count({ where }),
  ]);

  return {
    rows: rows.map(({ _count, ...v }) => ({
      ...v,
      compatibleSizesCount: _count.vehicleCompatibleSizes,
    })),
    meta: { page: args.page, perPage: args.perPage, total },
  };
};

export const findVehicleByIdForCompany = (companyId: string, id: string) =>
  prisma.vehicle.findFirst({ where: { id, companyId }, include: VEHICLE_INCLUDE });

export const findVehicleByLicensePlate = (companyId: string, licensePlate: string) =>
  prisma.vehicle.findFirst({
    where: { companyId, licensePlate: { equals: licensePlate, mode: 'insensitive' } },
  });

export const findVehicleByAssignedDriver = (driverId: string, excludeVehicleId?: string) =>
  prisma.vehicle.findFirst({
    where: {
      assignedDriverId: driverId,
      ...(excludeVehicleId ? { id: { not: excludeVehicleId } } : {}),
    },
  });

export const createVehicle = (companyId: string, input: VehicleCreateInput) =>
  prisma.$transaction(async (tx) =>
    tx.vehicle.create({
      data: {
        companyId,
        licensePlate: input.licensePlate,
        make: input.make,
        model: input.model,
        year: input.year,
        vin: input.vin ?? null,
        vehicleType: input.vehicleType ?? null,
        depotId: input.depotId,
        assignedDriverId: input.assignedDriverId ?? null,
        vehicleCompatibleSizes: {
          create: input.compatibleSizes.map((s) => ({
            width: s.width,
            aspectRatio: s.aspectRatio,
            rimDiameter: s.rimDiameter,
            axlePosition: s.axlePosition === 'ANY' ? null : s.axlePosition,
          })),
        },
      },
      include: VEHICLE_INCLUDE,
    }),
  );

export const updateVehicleMetadata = (id: string, data: Prisma.VehicleUpdateInput) =>
  prisma.vehicle.update({ where: { id }, data, include: VEHICLE_INCLUDE });

export const setVehicleArchived = (id: string, archived: boolean) =>
  prisma.vehicle.update({ where: { id }, data: { archived }, include: VEHICLE_INCLUDE });

export const replaceCompatibleSizes = async (
  vehicleId: string,
  sizes: VehicleCompatibleSizeInput[],
) => {
  // Delete-then-recreate: simpler than diffing and avoids stale rows from axle position changes
  await prisma.$transaction([
    prisma.vehicleCompatibleSize.deleteMany({ where: { vehicleId } }),
    prisma.vehicleCompatibleSize.createMany({
      data: sizes.map((s) => ({
        vehicleId,
        width: s.width,
        aspectRatio: s.aspectRatio,
        rimDiameter: s.rimDiameter,
        axlePosition: s.axlePosition === 'ANY' ? null : s.axlePosition,
      })),
    }),
  ]);
  return prisma.vehicle.findFirstOrThrow({ where: { id: vehicleId }, include: VEHICLE_INCLUDE });
};

export const assignDriver = (vehicleId: string, driverId: string | null) =>
  prisma.vehicle.update({
    where: { id: vehicleId },
    data: { assignedDriverId: driverId },
    include: VEHICLE_INCLUDE,
  });
