import type { ApiUsageStatus } from './tire';

export interface ApiTireHealthDistributionReport {
  buckets: Record<ApiUsageStatus, number>;
}

export interface ApiReplacementForecastReport {
  trackedTires: number;
  next30: number;
  next60: number;
  next90: number;
}

export interface ApiInspectionComplianceReport {
  totalVehicles: number;
  compliantVehicles: number;
  compliancePct: number;
  overdueVehicleIds: string[];
}

export interface ApiBrandBenchmarkingRow {
  brand: string;
  model: string;
  avgLifespanKm: number;
  avgVsExpectedPct: number | null;
  samples: number;
}

export interface ApiBrandBenchmarkingReport {
  rows: ApiBrandBenchmarkingRow[];
}

export interface ApiCostSummaryMonth {
  month: string;
  total: number;
}

export interface ApiCostSummaryReport {
  months: ApiCostSummaryMonth[];
}
