import { z } from 'zod';

export const clientErrorReportSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  stack: z.string().max(8000).optional(),
  digest: z.string().max(255).optional(),
  path: z.string().max(1000).optional(),
  userAgent: z.string().max(1000).optional(),
});

export type ClientErrorReportInput = z.infer<typeof clientErrorReportSchema>;
