import { prisma } from '@tirely/database';
import type { CompanyRequestStatus, Prisma } from '@tirely/database';
import type { CompanyRequestCreationInput } from '@tirely/validators';

const STATUS_LOOKUP_SELECT = {
  id: true,
  companyName: true,
  companyEmail: true,
  contactPersonName: true,
  contactPersonPhone: true,
  fleetSizeEstimate: true,
  depotCountEstimate: true,
  message: true,
  status: true,
  createdAt: true,
  reviewedAt: true,
  rejectionReason: true,
} as const satisfies Prisma.CompanyRequestSelect;

export type CompanyRequestStatusLookup = Prisma.CompanyRequestGetPayload<{
  select: typeof STATUS_LOOKUP_SELECT;
}>;

export interface ListCompanyRequestsArgs {
  skip: number;
  take: number;
  status?: CompanyRequestStatus;
  search?: string;
  sortOrder: 'asc' | 'desc';
}

export interface UpdateCompanyRequestStatusArgs {
  id: string;
  status: CompanyRequestStatus;
  rejectionReason: string | null;
  reviewedByUserId: string | null;
}


export const createCompanyRequest = (input: CompanyRequestCreationInput) =>
  prisma.companyRequest.create({ data: input });

// Latest only — a company may have re-applied after rejection; we want their current status
export const findLatestCompanyRequestByEmail = (email: string) =>
  prisma.companyRequest.findFirst({
    where: { companyEmail: { equals: email, mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    select: STATUS_LOOKUP_SELECT,
  });

export const findCompanyRequestById = (id: string) =>
  prisma.companyRequest.findUnique({ where: { id } });



function buildCompanyRequestWhere(
  args: Pick<ListCompanyRequestsArgs, 'status' | 'search'>,
): Prisma.CompanyRequestWhereInput {
  return {
    ...(args.status !== undefined && { status: args.status }),
    ...(args.search && { companyName: { contains: args.search, mode: 'insensitive' } }),
  };
}


function buildCompanyRequestStatusUpdate(args: UpdateCompanyRequestStatusArgs) {
  return {
    status: args.status,
    rejectionReason: args.rejectionReason,
    reviewedByUserId: args.reviewedByUserId,
    reviewedAt: new Date(),
  };
}


export const listCompanyRequests = async (args: ListCompanyRequestsArgs) => {
  const where = buildCompanyRequestWhere(args);

  const [requests, total] = await Promise.all([
    prisma.companyRequest.findMany({
      where,
      skip: args.skip,
      take: args.take,
      orderBy: { createdAt: args.sortOrder },
    }),
    prisma.companyRequest.count({ where }),
  ]);

  return { requests, total };
};

export const updateCompanyRequestStatus = (args: UpdateCompanyRequestStatusArgs) =>
  prisma.companyRequest.update({
    where: { id: args.id },
    data: buildCompanyRequestStatusUpdate(args),
  });
