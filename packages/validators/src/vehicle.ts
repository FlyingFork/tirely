import { z } from 'zod';

import { tireSizeSchema } from './tireSize';

const AXLE_POSITIONS = ['FRONT', 'REAR', 'REAR_DUALLY', 'SPARE', 'TRAILER', 'ANY'] as const;

export const vehicleCompatibleSizeSchema = tireSizeSchema.extend({
  axlePosition: z.enum(AXLE_POSITIONS).default('ANY'),
});
export type VehicleCompatibleSizeInput = z.infer<typeof vehicleCompatibleSizeSchema>;

export const vehicleCompatibleSizesReplaceSchema = z.object({
  sizes: z.array(vehicleCompatibleSizeSchema).min(1).max(20),
});

export const vehicleDriverAssignSchema = z.object({
  driverId: z.string().min(1).nullable(),
});
export type VehicleDriverAssignInput = z.infer<typeof vehicleDriverAssignSchema>;

export const vehicleCreateSchema = z.object({
  licensePlate: z.string().trim().min(1).max(20),
  make: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80),
  year: z
    .number()
    .int()
    .min(1980)
    .max(new Date().getFullYear() + 1),
  vin: z.string().trim().max(17).optional(),
  vehicleType: z.string().trim().max(40).optional(),
  depotId: z.string().min(1),
  assignedDriverId: z.string().min(1).optional(),
  compatibleSizes: z.array(vehicleCompatibleSizeSchema).min(1).max(20),
});
export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;

export const vehicleUpdateSchema = vehicleCreateSchema
  .omit({ assignedDriverId: true, compatibleSizes: true })
  .partial();
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;

export const vehicleListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  depotId: z.string().optional(),
  driverAssigned: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional(),
  ),
  archived: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional(),
  ),
  sortBy: z.enum(['licensePlate', 'make', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type VehicleListQueryInput = z.infer<typeof vehicleListQuerySchema>;
