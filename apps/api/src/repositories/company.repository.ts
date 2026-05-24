import { prisma } from '@tirely/database';
import type { CompanyStatus, Prisma } from '@tirely/database';

import { slugify } from '../lib/slug.js';

const MAX_SLUG_ATTEMPTS = 50;

export const generateUniqueCompanySlug = async (base: string): Promise<string> => {
  const root = slugify(base);
  let candidate = root;

  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
    const existing = await prisma.company.findUnique({ where: { slug: candidate } });
    if (!existing) {
      return candidate;
    }
    candidate = `${root}-${attempt + 1}`;
  }

  throw new Error(
    `Could not generate a unique slug for "${base}" after ${MAX_SLUG_ATTEMPTS} attempts`,
  );
};

export interface CreateCompanyInput {
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone?: string | null;
  companyRequestId?: string | null;
}

export const createCompany = (input: CreateCompanyInput) =>
  prisma.company.create({
    data: {
      name: input.name,
      slug: input.slug,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone ?? null,
      companyRequestId: input.companyRequestId ?? null,
    },
  });

export const findCompanyBySlugWithUsers = (slug: string) =>
  prisma.company.findUnique({
    where: { slug },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

export const findCompanyById = (id: string) =>
  prisma.company.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, status: true },
  });

export const findCompanyBySlugForAccessCheck = (slug: string) =>
  prisma.company.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      users: { select: { id: true, role: true } },
    },
  });

export interface ListCompaniesArgs {
  skip: number;
  take: number;
  status?: CompanyStatus;
  search?: string;
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export const listCompanies = async (args: ListCompaniesArgs) => {
  const where: Prisma.CompanyWhereInput = {
    ...(args.status !== undefined && { status: args.status }),
    ...(args.search && {
      OR: [
        { name: { contains: args.search, mode: 'insensitive' } },
        { slug: { contains: args.search, mode: 'insensitive' } },
        { contactEmail: { contains: args.search, mode: 'insensitive' } },
      ],
    }),
  };

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip: args.skip,
      take: args.take,
      orderBy: { [args.sortBy]: args.sortOrder },
      include: { _count: { select: { users: true } } },
    }),
    prisma.company.count({ where }),
  ]);

  return { companies, total };
};
