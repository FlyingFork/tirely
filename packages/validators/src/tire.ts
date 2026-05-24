import { z } from 'zod';

import { tireSizeSchema } from './tireSize';

export const tireCreateSchema = z.object({
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(120),
  size: tireSizeSchema,
  loadIndex: z.string().trim().max(8).optional(),
  speedRating: z.string().trim().max(4).optional(),
  dotCode: z.string().trim().max(20).optional(),
  serialNumber: z.string().trim().max(40).optional(),
  purchaseDate: z.coerce.date().refine((d) => d.getTime() <= Date.now(), 'Cannot be in the future'),
  purchasePrice: z.number().min(0).optional(),
  conditionNotes: z.string().trim().max(500).optional(),
  initialTreadDepth: z.number().min(1).max(50),
  expectedMileageLifespan: z.number().int().min(1000).max(2_000_000).optional(),
  depotId: z.string().min(1),
  catalogModelId: z.string().optional(),
});
export type TireCreateInput = z.infer<typeof tireCreateSchema>;

export const tirePerUnitSchema = z.object({
  dotCode: z.string().trim().max(20).optional(),
  serialNumber: z.string().trim().max(40).optional(),
  purchaseDate: z.coerce.date().refine((d) => d.getTime() <= Date.now(), 'Cannot be in the future'),
  purchasePrice: z.number().min(0).optional(),
  conditionNotes: z.string().trim().max(500).optional(),
});
export type TirePerUnitInput = z.infer<typeof tirePerUnitSchema>;

export const tireBatchCreateSchema = z.object({
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(120),
  size: tireSizeSchema,
  loadIndex: z.string().trim().max(8).optional(),
  speedRating: z.string().trim().max(4).optional(),
  initialTreadDepth: z.number().min(1).max(50),
  expectedMileageLifespan: z.number().int().min(1000).max(2_000_000).optional(),
  depotId: z.string().min(1),
  catalogModelId: z.string().optional(),
  tires: z.array(tirePerUnitSchema).min(1).max(50),
});
export type TireBatchCreateInput = z.infer<typeof tireBatchCreateSchema>;

export const tireUpdateSchema = z
  .object({
    loadIndex: z.string().trim().max(8).optional(),
    speedRating: z.string().trim().max(4).optional(),
    dotCode: z.string().trim().max(20).optional(),
    expectedMileageLifespan: z.number().int().min(1000).max(2_000_000).optional(),
    depotId: z.string().optional(),
  })
  .strict();
export type TireUpdateInput = z.infer<typeof tireUpdateSchema>;

export const tireListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(500).default(20),
  status: z.enum(['IN_STOCK', 'MOUNTED', 'RETREADING', 'DISPOSED']).optional(),
  depotId: z.string().optional(),
  search: z.string().trim().optional(),
  minUsage: z.coerce.number().min(0).max(100).optional(),
  maxUsage: z.coerce.number().min(0).max(100).optional(),
  sortBy: z.enum(['createdAt', 'usagePercentage', 'brand']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  archived: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional(),
  ),
  vehicleId: z.string().optional(),
});
export type TireListQueryInput = z.infer<typeof tireListQuerySchema>;
