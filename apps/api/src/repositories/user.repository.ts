import { prisma } from '@tirely/database';
import type { Prisma, User } from '@tirely/database';

export const findUserByEmail = (email: string) => prisma.user.findUnique({ where: { email } });

export const findUserByIdForCompany = (companyId: string, userId: string) =>
  prisma.user.findFirst({ where: { id: userId, companyId } });

export const listCompanyUsers = async (args: {
  companyId: string;
  page: number;
  perPage: number;
  search?: string;
  role?: string;
  active?: boolean;
}) => {
  const where: Prisma.UserWhereInput = {
    companyId: args.companyId,
    ...(args.role && { role: args.role }),
    ...(args.active !== undefined && { banned: !args.active }),
    ...(args.search && {
      OR: [
        { name: { contains: args.search, mode: 'insensitive' } },
        { email: { contains: args.search, mode: 'insensitive' } },
      ],
    }),
  };
  const skip = (args.page - 1) * args.perPage;
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take: args.perPage, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);
  return { users, meta: { page: args.page, perPage: args.perPage, total } };
};

export const updateUserRole = (userId: string, role: string) =>
  prisma.user.update({ where: { id: userId }, data: { role } });

export const setUserBanned = (userId: string, banned: boolean) =>
  prisma.user.update({
    where: { id: userId },
    data: {
      banned,
      banReason: banned ? 'Deactivated by fleet manager' : null,
      banExpires: null,
    },
  });

export const assignUserToCompany = (userId: string, companyId: string): Promise<User> =>
  prisma.user.update({
    where: { id: userId },
    data: { companyId },
  });

const USER_WITH_COMPANY_SLUG_SELECT = {
  id: true,
  email: true,
  role: true,
  company: { select: { slug: true } },
} as const satisfies Prisma.UserSelect;

export type UserWithCompanySlug = Prisma.UserGetPayload<{
  select: typeof USER_WITH_COMPANY_SLUG_SELECT;
}>;

export const findUserWithCompanySlug = (userId: string): Promise<UserWithCompanySlug | null> =>
  prisma.user.findUnique({
    where: { id: userId },
    select: USER_WITH_COMPANY_SLUG_SELECT,
  });

export const findUserCompanyId = (userId: string): Promise<{ companyId: string | null } | null> =>
  prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });

export const findUserFirstLoginFlag = (userId: string): Promise<{ firstLogin: boolean } | null> =>
  prisma.user.findUnique({
    where: { id: userId },
    select: { firstLogin: true },
  });

export const clearUserFirstLoginFlag = (userId: string): Promise<User> =>
  prisma.user.update({
    where: { id: userId },
    data: { firstLogin: false },
  });

export const setCredentialPassword = async (
  userId: string,
  hashedPassword: string,
): Promise<number> => {
  const result = await prisma.account.updateMany({
    where: { userId, providerId: 'credential' },
    data: { password: hashedPassword },
  });
  return result.count;
};
