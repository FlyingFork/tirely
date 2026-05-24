import type { ApiUsageStatus } from '../company/tire';

export interface ApiPlatformKpis {
  activeCompanies: number;
  activeUsers: number;
  vehicles: number;
  tires: number;
  inspectionsThisMonth: number;
  maintenanceThisMonth: number;
}

export interface ApiCompaniesOverTimeMonth {
  month: string;
  count: number;
}

export interface ApiCompaniesOverTimeReport {
  months: ApiCompaniesOverTimeMonth[];
}

export interface ApiRequestFunnelTotals {
  pending: number;
  approved: number;
  rejected: number;
}

export interface ApiRequestFunnelMonth {
  month: string;
  approved: number;
  rejected: number;
}

export interface ApiRequestFunnelReport {
  totals: ApiRequestFunnelTotals;
  monthly: ApiRequestFunnelMonth[];
}

export interface ApiCatalogGrowthTotals {
  brands: number;
  approvedModels: number;
  pendingModels: number;
}

export interface ApiCatalogGrowthMonth {
  month: string;
  approvedModels: number;
}

export interface ApiCatalogGrowthReport {
  totals: ApiCatalogGrowthTotals;
  monthly: ApiCatalogGrowthMonth[];
}

export interface ApiPlatformTireHealthDistributionReport {
  buckets: Record<ApiUsageStatus, number>;
}
