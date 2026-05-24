import { z } from 'zod';

const CATALOG_ENTRY_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
const MODERATION_STATUSES = ['APPROVED', 'REJECTED'] as const;
const TIRE_CATEGORIES = ['STEER', 'DRIVE', 'TRAILER', 'ALL_POSITION', 'WINTER', 'OTHER'] as const;

export const catalogModerationSchema = z
  .object({
    status: z.enum(MODERATION_STATUSES),
    rejectionReason: z.string().trim().max(500).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.status === 'REJECTED' &&
      value.rejectionReason !== undefined &&
      !value.rejectionReason.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rejectionReason'],
        message: 'Rejection reason cannot be empty',
      });
    }
  });
export type CatalogModerationInput = z.infer<typeof catalogModerationSchema>;

export const catalogModelEditSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    category: z.enum(TIRE_CATEGORIES).optional().nullable(),
    defaultInitialTreadDepth: z.number().min(0).max(50).optional().nullable(),
    defaultExpectedMileage: z.number().int().min(1000).max(2_000_000).optional().nullable(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });
export type CatalogModelEditInput = z.infer<typeof catalogModelEditSchema>;

export const catalogBrandRenameSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
  })
  .strict();
export type CatalogBrandRenameInput = z.infer<typeof catalogBrandRenameSchema>;

export const catalogAdminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(20),
  status: z.enum(CATALOG_ENTRY_STATUSES).optional(),
  search: z.string().trim().max(80).optional(),
});
export type CatalogAdminListQueryInput = z.infer<typeof catalogAdminListQuerySchema>;
