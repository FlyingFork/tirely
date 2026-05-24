import { prisma } from '@tirely/database';
import type { Prisma } from '@tirely/database';

const DEPOT_INCLUDE = {
  _count: { select: { vehicles: true } },
} as const satisfies Prisma.DepotInclude;

export type DepotWithCount = Prisma.DepotGetPayload<{ include: typeof DEPOT_INCLUDE }>;


type DepotListArgs = {
  companyId: string;
  page: number;
  perPage: number;
  search?: string;
  archived?: boolean;
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
};



function buildDepotWhere(args: DepotListArgs): Prisma.DepotWhereInput {
  return {
    companyId: args.companyId,
    ...(args.archived !== undefined ? { archived: args.archived } : {}),
    ...(args.search ? { name: { contains: args.search, mode: 'insensitive' } } : {}),
  };
}


function depotOffset(args: Pick<DepotListArgs, 'page' | 'perPage'>) {
  return (args.page - 1) * args.perPage;
}


function withVehicleCount(depot: DepotWithCount) {
  return { ...depot, vehicleCount: depot._count.vehicles };
}


export const listDepots = async (args: {
  companyId: string;
  page: number;
  perPage: number;
  search?: string;
  archived?: boolean;
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}) => {
  const where = buildDepotWhere(args);
  const [rows, total] = await Promise.all([
    prisma.depot.findMany({
      where,
      orderBy: { [args.sortBy]: args.sortOrder },
      skip: depotOffset(args),
      take: args.perPage,
      include: DEPOT_INCLUDE,
    }),
    prisma.depot.count({ where }),
  ]);
  return {
    rows: rows.map(withVehicleCount),
    meta: { page: args.page, perPage: args.perPage, total },
  };
};

export const findDepotById = (companyId: string, id: string) =>
  prisma.depot.findFirst({
    where: { id, companyId },
    include: DEPOT_INCLUDE,
  });

export const findDepotByName = (companyId: string, name: string) =>
  prisma.depot.findFirst({
    where: { companyId, name: { equals: name, mode: 'insensitive' } },
  });

export const createDepot = (
  companyId: string,
  data: { name: string; address?: string; contactInfo?: string },
) => prisma.depot.create({ data: { ...data, companyId } });

export const updateDepot = (id: string, data: Prisma.DepotUpdateInput) =>
  prisma.depot.update({ where: { id }, data });

export const setDepotArchived = (id: string, archived: boolean) =>
  prisma.depot.update({ where: { id }, data: { archived } });
