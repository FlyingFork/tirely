export type ApiUsageStatus =
  | 'NEW'
  | 'GOOD'
  | 'MODERATE'
  | 'HIGH'
  | 'CRITICAL'
  | 'REPLACE_IMMEDIATELY';

export type ApiUsageSafetyOverride =
  | 'NEEDS_REPLACEMENT'
  | 'NEEDS_MONITORING'
  | 'TREAD_CRITICAL'
  | 'AGE_EXCEEDED'
  | null;

export interface ApiTireUsageBreakdown {
  percentage: number;
  status: ApiUsageStatus;
  isEstimated: boolean;
  factors: {
    tread: { value: number | null; weight: number };
    mileage: { value: number | null; weight: number };
    age: { value: number | null; weight: number };
    condition: { value: number | null; weight: number };
  };
  appliedOverride: ApiUsageSafetyOverride;
}

export type ApiTireSummary = {
  id: string;
  brand: string;
  model: string;
  width: number;
  aspectRatio: number;
  rimDiameter: number;
  status: 'IN_STOCK' | 'MOUNTED' | 'RETREADING' | 'DISPOSED';
  usagePercentage: number | null;
  usageStatus: ApiUsageStatus | null;
  usageIsEstimated: boolean;
  currentVehicle: { id: string; licensePlate: string; position: string } | null;
  depot: { id: string; name: string } | null;
  latestInspectionDate: string | null;
  createdAt: string;
};

export type ApiTire = ApiTireSummary & {
  loadIndex: string | null;
  speedRating: string | null;
  dotCode: string | null;
  purchaseDate: string;
  initialTreadDepth: number;
  expectedMileageLifespan: number | null;
  retreadingCount: number;
  currentLifecycleNumber: number;
  latestTreadDepth: number | null;
  latestCondition: 'GOOD' | 'NEEDS_MONITORING' | 'NEEDS_REPLACEMENT' | null;
  accumulatedMileage: number;
  archived: boolean;
  tireSetId: string | null;
  catalogModelId: string | null;
  updatedAt: string;
};
