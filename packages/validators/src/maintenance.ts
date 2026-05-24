import { z } from 'zod';

const MAINTENANCE_TYPES = [
  'TIRE_REPLACEMENT',
  'TIRE_REPAIR',
  'RETREADING_SEND_OFF',
  'RETREADING_RETURN',
  'OTHER',
] as const;

export const maintenanceCreateSchema = z
  .object({
    vehicleId: z.string().min(1),
    type: z.enum(MAINTENANCE_TYPES),
    date: z.coerce.date(),
    description: z.string().trim().max(2000).optional(),
    cost: z.number().min(0).max(1_000_000).optional(),
    tireIds: z.array(z.string()).max(20).optional(),
    newTreadDepths: z.record(z.string(), z.number().min(1).max(50)).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'RETREADING_RETURN') {
      if (!data.tireIds || data.tireIds.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['tireIds'],
          message: 'Required for retreading return',
        });
      }
      if (!data.newTreadDepths) {
        ctx.addIssue({
          code: 'custom',
          path: ['newTreadDepths'],
          message: 'Required for retreading return',
        });
      } else if (data.tireIds) {
        for (const id of data.tireIds) {
          if (!data.newTreadDepths[id]) {
            ctx.addIssue({
              code: 'custom',
              path: ['newTreadDepths', id],
              message: 'Missing tread depth',
            });
          }
        }
      }
    }
  });

export type MaintenanceCreateInput = z.infer<typeof maintenanceCreateSchema>;

export const maintenanceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  vehicleId: z.string().optional(),
  type: z.enum(MAINTENANCE_TYPES).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export type MaintenanceListQuery = z.infer<typeof maintenanceListQuerySchema>;
