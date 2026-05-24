import { z } from 'zod';

export const mileageEntryCreateSchema = z.object({
  odometer: z.number().int().min(0).max(10_000_000),
  date: z.coerce
    .date()
    .refine((d) => d.getTime() <= Date.now() + 60_000, 'Date cannot be in the future'),
});
export type MileageEntryCreateInput = z.infer<typeof mileageEntryCreateSchema>;

export const mileageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(50),
});
export type MileageListQueryInput = z.infer<typeof mileageListQuerySchema>;
