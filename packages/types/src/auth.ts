export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  FLEET_MANAGER: 'fleet_manager',
  MAINTENANCE: 'maintenance',
  DRIVER: 'driver',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
