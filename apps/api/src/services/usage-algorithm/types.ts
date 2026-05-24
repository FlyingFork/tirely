export type UsageStatus = 'NEW' | 'GOOD' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'REPLACE_IMMEDIATELY';

export type ComputeInput = {
  tire: {
    initialTreadDepth: number;
    accumulatedMileage: number;
    purchaseDate: Date;
    currentLifecycleStartDate: Date | null;
    expectedMileageLifespan: number | null;
    latestTreadDepth: number | null;
    latestCondition: 'GOOD' | 'NEEDS_MONITORING' | 'NEEDS_REPLACEMENT' | null;
    latestInspectionDate: Date | null;
    mileageAtLastInspection: number;
  };
  settings: {
    minimumTreadDepth: number;
    maximumAgeMonths: number;
    defaultExpectedMileage: number;
    defaultWearRate: number;
    staleInspectionThresholdDays: number;
    treadWeight: number;
    mileageWeight: number;
    ageWeight: number;
    conditionWeight: number;
  };
  now: Date;
};

export type FactorBreakdown = {
  tread: { value: number | null; weight: number };
  mileage: { value: number | null; weight: number };
  age: { value: number | null; weight: number };
  condition: { value: number | null; weight: number };
};

export type SafetyOverride =
  | 'NEEDS_REPLACEMENT'
  | 'NEEDS_MONITORING'
  | 'TREAD_CRITICAL'
  | 'AGE_EXCEEDED'
  | null;

export type ComputeOutput = {
  percentage: number;
  status: UsageStatus;
  isEstimated: boolean;
  factors: FactorBreakdown;
  appliedOverride: SafetyOverride;
};
