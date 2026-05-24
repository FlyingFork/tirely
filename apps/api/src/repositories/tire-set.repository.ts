import { prisma } from '@tirely/database';
import type { Prisma } from '@tirely/database';
import type { TireSetCreateInput, TireSetUpdateInput } from '@tirely/validators';

const TIRE_SET_INCLUDE = {
  tires: {
    select: {
      id: true,
      brand: true,
      model: true,
      width: true,
      aspectRatio: true,
      rimDiameter: true,
    },
  },
} as const satisfies Prisma.TireSetInclude;

export type TireSetWithMembers = Prisma.TireSetGetPayload<{ include: typeof TIRE_SET_INCLUDE }>;

export const listTireSets = (companyId: string): Promise<TireSetWithMembers[]> =>
  prisma.tireSet.findMany({
    where: { companyId },
    include: TIRE_SET_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

export const getTireSetById = (id: string, companyId: string): Promise<TireSetWithMembers | null> =>
  prisma.tireSet.findFirst({
    where: { id, companyId },
    include: TIRE_SET_INCLUDE,
  });

export const createTireSet = (companyId: string, input: TireSetCreateInput) =>
  prisma.$transaction(async (tx) => {
    const set = await tx.tireSet.create({ data: { companyId, name: input.name } });
    await tx.tire.updateMany({
      where: { id: { in: input.tireIds }, companyId },
      data: { tireSetId: set.id },
    });
    return tx.tireSet.findUniqueOrThrow({ where: { id: set.id }, include: TIRE_SET_INCLUDE });
  });

export const updateTireSet = (id: string, companyId: string, input: TireSetUpdateInput) =>
  prisma.$transaction(async (tx) => {
    if (input.name) {
      await tx.tireSet.update({ where: { id }, data: { name: input.name } });
    }
    if (input.tireIds) {
      // Replace full membership: clear old tires, then assign the new list
      await tx.tire.updateMany({ where: { tireSetId: id }, data: { tireSetId: null } });
      await tx.tire.updateMany({
        where: { id: { in: input.tireIds }, companyId },
        data: { tireSetId: id },
      });
    }
    return tx.tireSet.findUniqueOrThrow({ where: { id }, include: TIRE_SET_INCLUDE });
  });

export const dissolveTireSet = (id: string) =>
  prisma.$transaction(async (tx) => {
    await tx.tire.updateMany({ where: { tireSetId: id }, data: { tireSetId: null } });
    await tx.tireSet.delete({ where: { id } });
  });
