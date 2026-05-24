import { z } from 'zod';

export const firstLoginPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type FirstLoginPasswordInput = z.infer<typeof firstLoginPasswordSchema>;

export const signInSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const passwordResetRequestSchema = z.object({
  email: z.email('Enter a valid email address'),
});

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

export const passwordResetSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

export const profileNameSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
});

export type ProfileNameInput = z.infer<typeof profileNameSchema>;

export const profilePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your new password'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type ProfilePasswordInput = z.infer<typeof profilePasswordSchema>;

export const adminRequestRejectSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(1, 'Rejection reason is required')
    .max(500, 'Rejection reason must be under 500 characters'),
});

export type AdminRequestRejectInput = z.infer<typeof adminRequestRejectSchema>;

export const adminUserBanSchema = z.object({
  banReason: z.string().trim().min(1, 'Ban reason is required').max(500),
  banExpiresIn: z.string().default('permanent'),
});

export type AdminUserBanInput = z.infer<typeof adminUserBanSchema>;

export * from './adminStatistics';
export * from './audit-log';
export * from './company/list';
export * from './company/request';
export * from './company/settings';
export * from './company/user';
export * from './depot';
export * from './tireSize';
export * from './catalog';
export * from './catalogAdmin';
export * from './vehicle';
export * from './mileage';
export * from './tire';
export * from './tireSet';
export * from './mounting';
export * from './inspection';
export * from './maintenance';
export * from './reports';
export * from './monitoring';
