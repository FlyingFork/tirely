import { z } from 'zod';

const VISUAL = ['GOOD', 'MINOR_WEAR', 'CONCERN'] as const;
const DETAILED_COND = ['GOOD', 'NEEDS_MONITORING', 'NEEDS_REPLACEMENT'] as const;

export const dailyInspectionTireResultSchema = z.object({
  tireId: z.string().min(1),
  visualCondition: z.enum(VISUAL),
  anomalyNotes: z.string().trim().max(500).optional(),
});
export const dailyInspectionSchema = z.object({
  vehicleId: z.string().min(1),
  date: z.coerce.date(),
  results: z.array(dailyInspectionTireResultSchema).min(1).max(10),
  overallNotes: z.string().trim().max(2000).optional(),
});
export type DailyInspectionInput = z.infer<typeof dailyInspectionSchema>;

export const detailedInspectionTireResultSchema = z.object({
  tireId: z.string().min(1),
  treadDepth: z.number().min(0).max(50),
  tirePressure: z.number().min(0).max(20).optional(),
  damageNotes: z.string().trim().max(500).optional(),
  condition: z.enum(DETAILED_COND),
});
export const detailedInspectionSchema = z.object({
  vehicleId: z.string().min(1),
  date: z.coerce.date(),
  results: z.array(detailedInspectionTireResultSchema).min(1).max(10),
  overallNotes: z.string().trim().max(2000).optional(),
});
export type DetailedInspectionInput = z.infer<typeof detailedInspectionSchema>;

export const inspectionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  vehicleId: z.string().optional(),
  type: z.enum(['DAILY_CHECK', 'DETAILED']).optional(),
  inspectorId: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});
export type InspectionListQueryInput = z.infer<typeof inspectionListQuerySchema>;
