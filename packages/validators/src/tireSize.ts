import { z } from 'zod';

export const tireSizeSchema = z.object({
  width: z.number().int().min(100).max(500),
  aspectRatio: z.number().int().min(20).max(100),
  rimDiameter: z.number().min(10).max(30),
});

export type TireSizeInput = z.infer<typeof tireSizeSchema>;
