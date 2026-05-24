import { z } from 'zod';

export const adminStatisticsMonthsQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(12),
});

export type AdminStatisticsMonthsQueryInput = z.infer<typeof adminStatisticsMonthsQuerySchema>;
