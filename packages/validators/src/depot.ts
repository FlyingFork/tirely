import { z } from 'zod';

export const depotCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(500).optional(),
  contactInfo: z.string().trim().max(500).optional(),
});
export type DepotCreateInput = z.infer<typeof depotCreateSchema>;

export const depotUpdateSchema = depotCreateSchema.partial();
export type DepotUpdateInput = z.infer<typeof depotUpdateSchema>;

export const depotListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  archived: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});
export type DepotListQueryInput = z.infer<typeof depotListQuerySchema>;
