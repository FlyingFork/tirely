import { z } from 'zod';

export const companySettingsUpdateSchema = z
  .object({
    minimumTreadDepth: z.number().min(0).max(20).optional(),
    maximumAgeMonths: z.number().int().min(1).max(240).optional(),
    defaultExpectedMileage: z.number().int().min(1000).max(2_000_000).optional(),
    staleInspectionThresholdDays: z.number().int().min(1).max(365).optional(),
    defaultWearRate: z.number().min(0).max(0.001).optional(),
    retreadingLifespanReduction: z.number().min(0).max(1).optional(),
    maxRetreadingCycles: z.number().int().min(0).max(10).optional(),

    treadWeight: z.number().min(0).max(1).optional(),
    mileageWeight: z.number().min(0).max(1).optional(),
    ageWeight: z.number().min(0).max(1).optional(),
    conditionWeight: z.number().min(0).max(1).optional(),

    alertInfoThreshold: z.number().min(0).max(100).optional(),
    alertUrgentThreshold: z.number().min(0).max(100).optional(),
    alertCriticalThreshold: z.number().min(0).max(100).optional(),
    imbalanceThreshold: z.number().min(0).max(100).optional(),
  })
  .refine(
    (data) => {
      const ws = [data.treadWeight, data.mileageWeight, data.ageWeight, data.conditionWeight];
      if (ws.every((w) => w !== undefined)) {
        const sum = ws.reduce((a, b) => a! + b!, 0)!;
        return Math.abs(sum - 1) < 0.001;
      }
      return true;
    },
    { message: 'Weights must sum to 1.0', path: ['treadWeight'] },
  )
  .refine(
    (data) => {
      if (
        data.alertInfoThreshold !== undefined &&
        data.alertUrgentThreshold !== undefined &&
        data.alertInfoThreshold > data.alertUrgentThreshold
      ) {
        return false;
      }
      if (
        data.alertUrgentThreshold !== undefined &&
        data.alertCriticalThreshold !== undefined &&
        data.alertUrgentThreshold > data.alertCriticalThreshold
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Thresholds must be ordered: info ≤ urgent ≤ critical',
      path: ['alertUrgentThreshold'],
    },
  );

export type CompanySettingsUpdateInput = z.infer<typeof companySettingsUpdateSchema>;
