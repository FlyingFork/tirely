export interface ApiDepot {
  id: string;
  companyId: string;
  name: string;
  address: string | null;
  contactInfo: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  vehicleCount?: number;
}
