import { z } from 'zod';

export const companyRequestCreationSchema = z.object({
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(100, 'Company name must be under 100 characters'),
  companyEmail: z.email('Invalid email address'),
  contactPersonName: z
    .string()
    .min(1, 'Contact person name is required')
    .max(100, 'Contact person name must be under 100 characters'),
  contactPersonPhone: z
    .string()
    .min(1, 'Phone number is required')
    .max(30, 'Phone number must be under 30 characters'),
  fleetSizeEstimate: z.string(),
  depotCountEstimate: z.number().int().min(1, 'Depot count must be at least 1'),
  message: z.string().max(2000).optional(),
});

export type CompanyRequestCreationInput = z.infer<typeof companyRequestCreationSchema>;

const companyRequestStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export const companyRequestUpdateSchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED']),
    rejectionReason: z.string().trim().min(1).max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'REJECTED' && !data.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rejectionReason'],
        message: 'Rejection reason is required when status is REJECTED',
      });
    }

    if (data.status !== 'REJECTED' && data.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rejectionReason'],
        message: 'Rejection reason is only allowed when status is REJECTED',
      });
    }
  });

export type CompanyRequestUpdateInput = z.infer<typeof companyRequestUpdateSchema>;

export const companyRequestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  status: companyRequestStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CompanyRequestListQueryInput = z.infer<typeof companyRequestListQuerySchema>;

export const companyRequestStatusQuerySchema = z.object({
  email: z.email('Invalid email address'),
});

export type CompanyRequestStatusQueryInput = z.infer<typeof companyRequestStatusQuerySchema>;

export const companySlugParamSchema = z.object({
  slug: z.string().min(1),
});

export type CompanySlugParam = z.infer<typeof companySlugParamSchema>;
