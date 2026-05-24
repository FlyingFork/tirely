export type ApiInspectionTireResult = {
  id: string;
  tireId: string;
  position: string;
  visualCondition: 'GOOD' | 'MINOR_WEAR' | 'CONCERN' | null;
  treadDepth: number | null;
  tirePressure: number | null;
  damageNotes: string | null;
  condition: 'GOOD' | 'NEEDS_MONITORING' | 'NEEDS_REPLACEMENT' | null;
  anomalyNotes: string | null;
};

export type ApiInspection = {
  id: string;
  vehicleId: string;
  vehicle: { id: string; licensePlate: string; make: string; model: string };
  inspector: { id: string; name: string };
  type: 'DAILY_CHECK' | 'DETAILED';
  date: string;
  overallNotes: string | null;
  results: ApiInspectionTireResult[];
  createdAt: string;
};

export type ApiInspectionListItem = {
  id: string;
  vehicleId: string;
  vehicle: { id: string; licensePlate: string; make: string; model: string };
  inspector: { id: string; name: string };
  type: 'DAILY_CHECK' | 'DETAILED';
  date: string;
  createdAt: string;
  resultCount: number;
  concernCount: number;
};

export type ApiMountedTire = {
  tireId: string;
  position: string;
  brand: string;
  model: string;
};
