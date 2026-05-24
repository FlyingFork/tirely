import { prisma } from '@tirely/database';
import type { MileageEntry, Prisma } from '@tirely/database';

const MILEAGE_INCLUDE = {
  recordedBy: { select: { id: true, name: true } },
} as const satisfies Prisma.MileageEntryInclude;

export type MileageEntryWithUser = Prisma.MileageEntryGetPayload<{
  include: typeof MILEAGE_INCLUDE;
}>;

export const findLatestMileage = (
  vehicleId: string,
): Promise<MileageEntry | null> =>
  prisma.mileageEntry.findFirst({ where: { vehicleId }, orderBy: { date: 'desc' } });


export const createMileageEntry = (input: {
  vehicleId: string;
  recordedById: string;
  odometer: number;
  date: Date;
}): Promise<MileageEntry> => prisma.mileageEntry.create({ data: input });

export const listMileageEntries = async (args: {
  vehicleId: string;
  page: number;
  perPage: number;
}) => {
  const [rows, total] = await Promise.all([
    prisma.mileageEntry.findMany({
      where: { vehicleId: args.vehicleId },
      orderBy: { date: 'desc' },
      skip: (args.page - 1) * args.perPage,
      take: args.perPage,
      include: MILEAGE_INCLUDE,
    }),
    prisma.mileageEntry.count({ where: { vehicleId: args.vehicleId } }),
  ]);
  return { rows, meta: { page: args.page, perPage: args.perPage, total } };
};
