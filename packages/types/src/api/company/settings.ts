export interface ApiCompanySettings {
  id: string;
  companyId: string;
  minimumTreadDepth: number;
  maximumAgeMonths: number;
  defaultExpectedMileage: number;
  staleInspectionThresholdDays: number;
  defaultWearRate: number;
  retreadingLifespanReduction: number;
  maxRetreadingCycles: number;
  treadWeight: number;
  mileageWeight: number;
  ageWeight: number;
  conditionWeight: number;
  alertInfoThreshold: number;
  alertUrgentThreshold: number;
  alertCriticalThreshold: number;
  imbalanceThreshold: number;
  createdAt: string;
  updatedAt: string;
}
