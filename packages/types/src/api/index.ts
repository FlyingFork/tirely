export * from './audit-log';
export * from './admin/statistics';
export * from './catalog';
export * from './company/company';
export * from './company/depot';
export * from './company/vehicle';
export * from './company/mileage';
export * from './company/tire';
export * from './company/tire-set';
export * from './company/request';
export * from './company/settings';
export * from './company/inspection';
export * from './company/maintenance';
export * from './company/reports';
export * from './me';

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
  };
}

export const ERROR_CODES = {
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  MILEAGE_REGRESSION: 'MILEAGE_REGRESSION',
  FITMENT_OVERRIDE_REQUIRED: 'FITMENT_OVERRIDE_REQUIRED',
  TIRE_NOT_AVAILABLE: 'TIRE_NOT_AVAILABLE',
  RETREADING_LIMIT_REACHED: 'RETREADING_LIMIT_REACHED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  requestId?: string;
}
