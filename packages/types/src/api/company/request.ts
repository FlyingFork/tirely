import type { CompanyRequestStatus } from '@tirely/database';
import type { CompanyRequestCreationInput } from '@tirely/validators';

export type ApiCompanyRequestBody = CompanyRequestCreationInput;

export interface ApiCompanyRequestStatus {
  id: string;
  companyName: string;
  companyEmail: string;
  contactPersonName: string;
  contactPersonPhone: string;
  fleetSizeEstimate: string;
  depotCountEstimate: number;
  message: string | null;
  status: CompanyRequestStatus;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}
