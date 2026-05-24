import { prisma } from '@tirely/database';
import type { CatalogEntryStatus, Prisma } from '@tirely/database';
import type { CatalogModelEditInput, CatalogModerationInput } from '@tirely/validators';
import type { ApiAdminCatalogBrand, ApiAdminCatalogModel } from '@tirely/types';

const ADMIN_CATALOG_MODEL_INCLUDE = {
  brand: { select: { id: true, name: true, status: true } },
  sizes: true,
  submittedByCompany: { select: { id: true, name: true } },
  _count: { select: { tires: true } },
} as const satisfies Prisma.CatalogModelInclude;

type AdminCatalogModelRecord = Prisma.CatalogModelGetPayload<{
  include: typeof ADMIN_CATALOG_MODEL_INCLUDE;
}>;

const BRAND_COUNT_INCLUDE = {
  _count: { select: { models: true } },
} as const satisfies Prisma.CatalogBrandInclude;

type AdminCatalogBrandRecord = Prisma.CatalogBrandGetPayload<{
  include: typeof BRAND_COUNT_INCLUDE;
}>;

const toAdminCatalogModel = (row: AdminCatalogModelRecord): ApiAdminCatalogModel => ({
  id: row.id,
  brandId: row.brandId,
  brand: row.brand,
  name: row.name,
  category: row.category,
  defaultInitialTreadDepth: row.defaultInitialTreadDepth,
  defaultExpectedMileage: row.defaultExpectedMileage,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  submittedByCompanyId: row.submittedByCompanyId,
  submittedByCompany: row.submittedByCompany,
  sizes: row.sizes.map((size) => ({
    id: size.id,
    catalogModelId: size.catalogModelId,
    width: size.width,
    aspectRatio: size.aspectRatio,
    rimDiameter: size.rimDiameter,
  })),
  tiresUsingCount: row._count.tires,
});

const toAdminCatalogBrand = (row: AdminCatalogBrandRecord): ApiAdminCatalogBrand => ({
  id: row.id,
  name: row.name,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  modelCount: row._count.models,
});

export const listAdminCatalogModels = async (args: {
  status?: CatalogEntryStatus;
  search?: string;
  page: number;
  perPage: number;
}) => {
  const where: Prisma.CatalogModelWhereInput = {
    ...(args.status ? { status: args.status } : {}),
    ...(args.search
      ? {
          OR: [
            { name: { contains: args.search, mode: 'insensitive' } },
            { brand: { name: { contains: args.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.CatalogModelOrderByWithRelationInput[] =
    args.status === 'APPROVED'
      ? [{ brand: { name: 'asc' } }, { name: 'asc' }]
      : [{ createdAt: 'desc' }];

  const [rows, total] = await Promise.all([
    prisma.catalogModel.findMany({
      where,
      include: ADMIN_CATALOG_MODEL_INCLUDE,
      orderBy,
      skip: (args.page - 1) * args.perPage,
      take: args.perPage,
    }),
    prisma.catalogModel.count({ where }),
  ]);

  return {
    rows: rows.map(toAdminCatalogModel),
    meta: { page: args.page, perPage: args.perPage, total },
  };
};

export const listAdminCatalogBrands = async (args: {
  status?: CatalogEntryStatus;
  search?: string;
}) => {
  const rows = await prisma.catalogBrand.findMany({
    where: {
      ...(args.status ? { status: args.status } : {}),
      ...(args.search ? { name: { contains: args.search, mode: 'insensitive' } } : {}),
    },
    include: BRAND_COUNT_INCLUDE,
    orderBy: { name: 'asc' },
  });

  return rows.map(toAdminCatalogBrand);
};

export const moderateCatalogModel = async (
  id: string,
  input: CatalogModerationInput,
  actorUserId: string,
  ipAddress: string,
) =>
  prisma.$transaction(async (tx) => {
    const model = await tx.catalogModel.findUnique({
      where: { id },
      include: ADMIN_CATALOG_MODEL_INCLUDE,
    });

    if (!model) {
      throw new Error('NOT_FOUND');
    }

    if (model.status === 'APPROVED') {
      throw new Error('MODEL_ALREADY_APPROVED');
    }

    if (input.status === 'APPROVED' && model.brand.status === 'REJECTED') {
      throw new Error('PARENT_BRAND_REJECTED');
    }

    const updatedModel = await tx.catalogModel.update({
      where: { id },
      data: { status: input.status },
      include: ADMIN_CATALOG_MODEL_INCLUDE,
    });

    await tx.auditLog.create({
      data: {
        action: input.status === 'APPROVED' ? 'CATALOG_MODEL_APPROVED' : 'CATALOG_MODEL_REJECTED',
        actorUserId,
        entityType: 'CatalogModel',
        entityId: updatedModel.id,
        details: JSON.stringify({
          previousStatus: model.status,
          nextStatus: input.status,
          rejectionReason: input.rejectionReason?.trim() || null,
          brandId: updatedModel.brandId,
          brandName: updatedModel.brand.name,
          modelName: updatedModel.name,
          submittedByCompanyId: updatedModel.submittedByCompanyId,
        }),
        ipAddress,
      },
    });

    // Auto-approve the parent brand when its first model is approved
    if (input.status === 'APPROVED' && model.brand.status === 'PENDING') {
      const brand = await tx.catalogBrand.update({
        where: { id: model.brand.id },
        data: { status: 'APPROVED' },
      });

      await tx.auditLog.create({
        data: {
          action: 'CATALOG_BRAND_APPROVED',
          actorUserId,
          entityType: 'CatalogBrand',
          entityId: brand.id,
          details: JSON.stringify({
            previousStatus: model.brand.status,
            nextStatus: brand.status,
            brandName: brand.name,
            autoApprovedByModelId: updatedModel.id,
          }),
          ipAddress,
        },
      });
    }

    return toAdminCatalogModel(updatedModel);
  });

export const moderateCatalogBrand = async (
  id: string,
  input: CatalogModerationInput,
  actorUserId: string,
  ipAddress: string,
) => {
  const brand = await prisma.catalogBrand.findUnique({ where: { id } });
  if (!brand) {
    throw new Error('NOT_FOUND');
  }

  if (brand.status === 'APPROVED') {
    throw new Error('BRAND_ALREADY_APPROVED');
  }

  const updated = await prisma.catalogBrand.update({
    where: { id },
    data: { status: input.status },
    include: BRAND_COUNT_INCLUDE,
  });

  await prisma.auditLog.create({
    data: {
      action: input.status === 'APPROVED' ? 'CATALOG_BRAND_APPROVED' : 'CATALOG_BRAND_REJECTED',
      actorUserId,
      entityType: 'CatalogBrand',
      entityId: updated.id,
      details: JSON.stringify({
        previousStatus: brand.status,
        nextStatus: input.status,
        rejectionReason: input.rejectionReason?.trim() || null,
        brandName: updated.name,
      }),
      ipAddress,
    },
  });

  return toAdminCatalogBrand(updated);
};

export const editCatalogModel = async (id: string, data: CatalogModelEditInput) => {
  const existing = await prisma.catalogModel.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('NOT_FOUND');
  }

  if (existing.status !== 'APPROVED') {
    throw new Error('MODEL_NOT_APPROVED');
  }

  const updated = await prisma.catalogModel.update({
    where: { id },
    data: {
      ...data,
      category: data.category as never,
    },
    include: ADMIN_CATALOG_MODEL_INCLUDE,
  });

  return toAdminCatalogModel(updated);
};

export const renameCatalogBrand = async (id: string, name: string) => {
  const existing = await prisma.catalogBrand.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('NOT_FOUND');
  }

  if (existing.status !== 'APPROVED') {
    throw new Error('BRAND_NOT_APPROVED');
  }

  const conflict = await prisma.catalogBrand.findFirst({
    where: {
      id: { not: id },
      name: { equals: name, mode: 'insensitive' },
    },
  });

  if (conflict) {
    throw new Error('BRAND_NAME_CONFLICT');
  }

  const updated = await prisma.catalogBrand.update({
    where: { id },
    data: { name },
    include: BRAND_COUNT_INCLUDE,
  });

  return toAdminCatalogBrand(updated);
};
