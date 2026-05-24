import type { CompanyStatus } from '@tirely/database';

export interface ApiCompany {
  id: string;
  name: string;
  slug: string;
  status: CompanyStatus;
  contactEmail: string;
  contactPhone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCompanyUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
}

export interface ApiCompanyListItem extends ApiCompany {
  userCount: number;
}

export interface ApiCompanyMember {
  id: string;
  name: string;
  email: string;
  role: 'fleet_manager' | 'maintenance' | 'driver';
  banned: boolean;
  banExpires: string | null;
  firstLogin: boolean;
  createdAt: string;
}
