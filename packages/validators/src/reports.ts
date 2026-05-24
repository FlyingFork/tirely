import { z } from 'zod';

const allowedMonths = [6, 12, 24] as const;

export const costSummaryQuerySchema = z.object({
  months: z.coerce
    .number()
    .int()
    .refine((value) => allowedMonths.includes(value as (typeof allowedMonths)[number]), {
      message: 'Months must be one of 6, 12, or 24',
    })
    .default(12),
});

export type CostSummaryQueryInput = z.infer<typeof costSummaryQuerySchema>;
