import { z } from 'zod';

export const companyListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(['name', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CompanyListQueryInput = z.infer<typeof companyListQuerySchema>;
