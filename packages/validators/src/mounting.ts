import { z } from 'zod';

const POSITIONS = ['FRONT_LEFT', 'FRONT_RIGHT', 'REAR_LEFT', 'REAR_RIGHT', 'SPARE'] as const;
const DISMOUNT_REASONS = [
  'REPLACEMENT',
  'SEASONAL_SWAP',
  'END_OF_LIFE',
  'SENT_FOR_RETREADING',
] as const;

export const mountTireAssignmentSchema = z.object({
  tireId: z.string().min(1),
  position: z.enum(POSITIONS),
});

export const mountTiresSchema = z.object({
  vehicleId: z.string().min(1),
  date: z.coerce
    .date()
    .refine((d) => d.getTime() <= Date.now() + 60_000, 'Date cannot be in the future'),
  odometer: z.number().int().min(0).max(10_000_000),
  assignments: z.array(mountTireAssignmentSchema).min(1).max(10),
  tireSetId: z.string().optional(),
  positionMap: z.record(z.string(), z.enum(POSITIONS)).optional(),
  confirmFitmentOverride: z.boolean().optional(),
  fitmentNote: z.string().trim().max(500).optional(),
});
export type MountTiresInput = z.infer<typeof mountTiresSchema>;

export const dismountTiresSchema = z.object({
  vehicleId: z.string().min(1),
  date: z.coerce.date(),
  odometer: z.number().int().min(0),
  tireIds: z.array(z.string().min(1)).min(1).max(10),
  reason: z.enum(DISMOUNT_REASONS),
  targetDepotId: z.string().min(1),
});
export type DismountTiresInput = z.infer<typeof dismountTiresSchema>;

export const rotateTiresSchema = z.object({
  vehicleId: z.string().min(1),
  date: z.coerce.date(),
  odometer: z.number().int().min(0),
  swaps: z
    .array(z.object({ tireId: z.string(), newPosition: z.enum(POSITIONS) }))
    .min(1)
    .max(10),
  confirmFitmentOverride: z.boolean().optional(),
  fitmentNote: z.string().trim().max(500).optional(),
});
export type RotateTiresInput = z.infer<typeof rotateTiresSchema>;
