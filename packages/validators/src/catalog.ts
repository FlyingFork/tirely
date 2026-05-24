import { z } from 'zod';

import { tireSizeSchema } from './tireSize';

export const catalogListQuerySchema = z.object({
  search: z.string().trim().min(1).max(80).optional(),
  perPage: z.coerce.number().int().min(1).max(50).default(20),
});
export type CatalogListQueryInput = z.infer<typeof catalogListQuerySchema>;

export const catalogBrandCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
});
export type CatalogBrandCreateInput = z.infer<typeof catalogBrandCreateSchema>;

const TIRE_CATEGORIES = ['STEER', 'DRIVE', 'TRAILER', 'ALL_POSITION', 'WINTER', 'OTHER'] as const;

export const catalogModelCreateSchema = z.object({
  brandId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  category: z.enum(TIRE_CATEGORIES).optional(),
  defaultInitialTreadDepth: z.number().min(0).max(50).optional(),
  defaultExpectedMileage: z.number().int().min(1000).max(2_000_000).optional(),
  sizes: z.array(tireSizeSchema).min(1).max(20),
});
export type CatalogModelCreateInput = z.infer<typeof catalogModelCreateSchema>;

export const catalogModelSizeCreateSchema = tireSizeSchema;
