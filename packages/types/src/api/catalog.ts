export type ApiCatalogBrand = {
  id: string;
  name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt?: string;
};

export type ApiCatalogModel = {
  id: string;
  brandId: string;
  brand: { id: string; name: string };
  name: string;
  category: 'STEER' | 'DRIVE' | 'TRAILER' | 'ALL_POSITION' | 'WINTER' | 'OTHER' | null;
  defaultInitialTreadDepth: number | null;
  defaultExpectedMileage: number | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt?: string;
};

export type ApiCatalogSize = {
  id: string;
  catalogModelId: string;
  width: number;
  aspectRatio: number;
  rimDiameter: number;
};

export type ApiAdminCatalogBrand = {
  id: string;
  name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  modelCount: number;
};

export type ApiAdminCatalogModel = {
  id: string;
  brandId: string;
  brand: {
    id: string;
    name: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
  };
  name: string;
  category: 'STEER' | 'DRIVE' | 'TRAILER' | 'ALL_POSITION' | 'WINTER' | 'OTHER' | null;
  defaultInitialTreadDepth: number | null;
  defaultExpectedMileage: number | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  submittedByCompanyId: string | null;
  submittedByCompany: { id: string; name: string } | null;
  sizes: ApiCatalogSize[];
  tiresUsingCount: number;
};
