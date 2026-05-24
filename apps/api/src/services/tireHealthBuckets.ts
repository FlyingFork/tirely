import type {
  ApiPlatformTireHealthDistributionReport,
  ApiTireHealthDistributionReport,
  ApiUsageStatus,
} from '@tirely/types';

type TireHealthBuckets =
  | ApiPlatformTireHealthDistributionReport['buckets']
  | ApiTireHealthDistributionReport['buckets'];

const USAGE_STATUSES: ApiUsageStatus[] = [
  'NEW',
  'GOOD',
  'MODERATE',
  'HIGH',
  'CRITICAL',
  'REPLACE_IMMEDIATELY',
];

const USAGE_STATUS_SET = new Set<string>(USAGE_STATUSES);

export function createTireHealthBuckets(): TireHealthBuckets {
  return Object.fromEntries(USAGE_STATUSES.map((status) => [status, 0])) as TireHealthBuckets;
}

export function isTireHealthStatus(status: unknown): status is ApiUsageStatus {
  return typeof status === 'string' && USAGE_STATUS_SET.has(status);
}

export function summarizeTireHealthStatuses(statuses: unknown[]): TireHealthBuckets {
  const buckets = createTireHealthBuckets();

  for (const status of statuses) {
    if (isTireHealthStatus(status)) {
      buckets[status] += 1;
    }
  }

  return buckets;
}
