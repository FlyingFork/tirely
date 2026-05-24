import { z } from 'zod';

const COMPANY_ROLES = ['fleet_manager', 'maintenance', 'driver'] as const;

export const companyUserInviteSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  name: z.string().min(1).max(120),
  role: z.enum(COMPANY_ROLES),
});
export type CompanyUserInviteInput = z.infer<typeof companyUserInviteSchema>;

export const companyUserUpdateRoleSchema = z.object({
  role: z.enum(COMPANY_ROLES),
});
export type CompanyUserUpdateRoleInput = z.infer<typeof companyUserUpdateRoleSchema>;

export const companyUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  role: z.enum(COMPANY_ROLES).optional(),
  active: z.coerce.boolean().optional(),
});
export type CompanyUserListQueryInput = z.infer<typeof companyUserListQuerySchema>;
