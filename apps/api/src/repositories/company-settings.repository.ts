import { prisma } from '@tirely/database';
import type { Prisma } from '@tirely/database';

export const getOrCreateCompanySettings = async (companyId: string) => {
  const existing = await prisma.companySettings.findUnique({ where: { companyId } });
  if (existing) return existing;
  return prisma.companySettings.create({ data: { companyId } });
};

export const updateCompanySettings = (companyId: string, data: Prisma.CompanySettingsUpdateInput) =>
  prisma.companySettings.update({ where: { companyId }, data });
