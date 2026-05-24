import { prisma } from '@tirely/database';
import type { CatalogEntryStatus, Prisma, TireCategory } from '@tirely/database';

const OWN_VISIBLE_STATUSES: CatalogEntryStatus[] = ['PENDING', 'REJECTED'];

const CATALOG_MODEL_INCLUDE = {
  brand: { select: { id: true, name: true } },
} as const satisfies Prisma.CatalogModelInclude;

export type CatalogModelWithBrand = Prisma.CatalogModelGetPayload<{
  include: typeof CATALOG_MODEL_INCLUDE;
}>;

export const listCatalogBrands = (args: {
  search?: string;
  submittedByCompanyId?: string;
  limit: number;
}) =>
  // IIFE so we can do the audit log pre-query without a wrapper function
  (async () => {
    let submittedBrandIds: string[] = [];

    if (args.submittedByCompanyId) {
      const logs = await prisma.auditLog.findMany({
        where: {
          companyId: args.submittedByCompanyId,
          entityType: 'CatalogBrand',
          action: 'CATALOG_BRAND_SUBMITTED',
          entityId: { not: null },
        },
        select: { entityId: true },
      });
      submittedBrandIds = logs
        .map((log) => log.entityId)
        .filter((entityId): entityId is string => entityId !== null);
    }

    return prisma.catalogBrand.findMany({
      where: {
        OR: [
          { status: 'APPROVED' },
          ...(submittedBrandIds.length > 0 ? [{ id: { in: submittedBrandIds } }] : []),
          ...(args.submittedByCompanyId
            ? [
                {
                  status: { in: OWN_VISIBLE_STATUSES },
                  models: { some: { submittedByCompanyId: args.submittedByCompanyId } },
                },
              ]
            : []),
        ],
        ...(args.search ? { name: { contains: args.search, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      take: args.limit,
    });
  })();

export const listCatalogModels = (args: {
  brandId: string;
  search?: string;
  submittedByCompanyId?: string;
  limit: number;
}) =>
  prisma.catalogModel.findMany({
    where: {
      brandId: args.brandId,
      OR: [
        { status: 'APPROVED' },
        ...(args.submittedByCompanyId
          ? [
              {
                status: { in: OWN_VISIBLE_STATUSES },
                submittedByCompanyId: args.submittedByCompanyId,
              },
            ]
          : []),
      ],
      ...(args.search ? { name: { contains: args.search, mode: 'insensitive' } } : {}),
    },
    include: CATALOG_MODEL_INCLUDE,
    orderBy: { name: 'asc' },
    take: args.limit,
  });

export const listCatalogSizes = (modelId: string) =>
  prisma.catalogModelSize.findMany({
    where: { catalogModelId: modelId },
    orderBy: [{ width: 'asc' }, { aspectRatio: 'asc' }, { rimDiameter: 'asc' }],
  });

export const upsertPendingBrand = async (name: string) => {
  const existing = await prisma.catalogBrand.findUnique({ where: { name } });
  if (existing) return existing;
  return prisma.catalogBrand.create({ data: { name, status: 'PENDING' } });
};

export const createPendingModel = (input: {
  brandId: string;
  name: string;
  category?: string;
  defaultInitialTreadDepth?: number;
  defaultExpectedMileage?: number;
  sizes: { width: number; aspectRatio: number; rimDiameter: number }[];
  submittedByCompanyId: string;
}) =>
  prisma.catalogModel.create({
    data: {
      brandId: input.brandId,
      name: input.name,
      category: input.category as TireCategory | undefined,
      defaultInitialTreadDepth: input.defaultInitialTreadDepth,
      defaultExpectedMileage: input.defaultExpectedMileage,
      submittedByCompanyId: input.submittedByCompanyId,
      status: 'PENDING',
      sizes: { create: input.sizes },
    },
    include: CATALOG_MODEL_INCLUDE,
  });

export const addSizeToModel = (
  modelId: string,
  size: { width: number; aspectRatio: number; rimDiameter: number },
) => prisma.catalogModelSize.create({ data: { catalogModelId: modelId, ...size } });
