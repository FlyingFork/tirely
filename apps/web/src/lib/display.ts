export const ROLE_COLORS: Record<string, 'red' | 'purple' | 'orange' | 'blue' | 'gray'> = {
  admin: 'red',
  fleet_manager: 'purple',
  maintenance: 'orange',
  driver: 'blue',
  user: 'gray',
};

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  fleet_manager: 'Fleet Manager',
  maintenance: 'Maintenance',
  driver: 'Driver',
  user: 'User',
};

export const requestStatusColor = (status: string): 'orange' | 'green' | 'red' => {
  if (status === 'APPROVED') return 'green';
  if (status === 'REJECTED') return 'red';
  return 'orange';
};

export const catalogEntryStatusColor = requestStatusColor;

export const companyStatusColor = (status: string): 'green' | 'red' =>
  status === 'ACTIVE' ? 'green' : 'red';

export const BAN_DURATIONS_SECONDS = {
  ONE_DAY: 86400,
  SEVEN_DAYS: 604800,
  THIRTY_DAYS: 2592000,
  NINETY_DAYS: 7776000,
} as const;

export const usageBucketColor = (
  status: string,
): 'green' | 'yellow' | 'orange' | 'red' | 'crimson' => {
  switch (status) {
    case 'NEW':
    case 'GOOD':
      return 'green';
    case 'MODERATE':
      return 'yellow';
    case 'HIGH':
      return 'orange';
    case 'CRITICAL':
      return 'red';
    case 'REPLACE_IMMEDIATELY':
      return 'crimson';
    default:
      return 'green';
  }
};

export const usageBucketLabel = (status: string): string =>
  ({
    NEW: 'New',
    GOOD: 'Good',
    MODERATE: 'Moderate',
    HIGH: 'High',
    CRITICAL: 'Critical',
    REPLACE_IMMEDIATELY: 'Replace now',
  })[status] ?? status;

export const tireStatusColor = (status: string): 'gray' | 'green' | 'orange' | 'red' =>
  (
    ({ IN_STOCK: 'gray', MOUNTED: 'green', RETREADING: 'orange', DISPOSED: 'red' }) as Record<
      string,
      'gray' | 'green' | 'orange' | 'red'
    >
  )[status] ?? 'gray';

export const tireStatusLabel = (status: string): string =>
  ({ IN_STOCK: 'In stock', MOUNTED: 'Mounted', RETREADING: 'Retreading', DISPOSED: 'Disposed' })[
    status
  ] ?? status;

export const maintenanceTypeColor = (type: string): string =>
  ({
    TIRE_REPLACEMENT: 'blue',
    TIRE_REPAIR: 'cyan',
    RETREADING_SEND_OFF: 'orange',
    RETREADING_RETURN: 'green',
    OTHER: 'gray',
  })[type] ?? 'gray';

export const maintenanceTypeLabel = (type: string): string =>
  ({
    TIRE_REPLACEMENT: 'Replacement',
    TIRE_REPAIR: 'Repair',
    RETREADING_SEND_OFF: 'Sent for retreading',
    RETREADING_RETURN: 'Returned from retreading',
    OTHER: 'Other',
  })[type] ?? type;
