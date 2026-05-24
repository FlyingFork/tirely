export interface ApiVehicleCompatibleSize {
  id: string;
  width: number;
  aspectRatio: number;
  rimDiameter: number;
  axlePosition: 'FRONT' | 'REAR' | 'REAR_DUALLY' | 'SPARE' | 'TRAILER' | 'ANY';
}

export interface ApiVehicle {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  vin: string | null;
  vehicleType: string | null;
  archived: boolean;
  depot: { id: string; name: string };
  assignedDriver: { id: string; name: string; email: string } | null;
  compatibleSizes: ApiVehicleCompatibleSize[];
  createdAt: string;
  updatedAt: string;
}

export type ApiVehicleListItem = Omit<ApiVehicle, 'compatibleSizes' | 'createdAt' | 'updatedAt'> & {
  compatibleSizesCount: number;
};
