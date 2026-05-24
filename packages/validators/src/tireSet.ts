import { z } from 'zod';

export const tireSetCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  tireIds: z.array(z.string().min(1)).min(1).max(20),
});
export type TireSetCreateInput = z.infer<typeof tireSetCreateSchema>;

export const tireSetUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  tireIds: z.array(z.string().min(1)).min(1).max(20).optional(),
});
export type TireSetUpdateInput = z.infer<typeof tireSetUpdateSchema>;
