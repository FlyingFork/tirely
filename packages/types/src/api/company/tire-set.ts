export type ApiTireSetMember = {
  id: string;
  brand: string;
  model: string;
  width: number;
  aspectRatio: number;
  rimDiameter: number;
};

export type ApiTireSet = {
  id: string;
  companyId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tires: ApiTireSetMember[];
};
