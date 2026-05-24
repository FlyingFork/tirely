export type ApiMaintenanceEvent = {
  id: string;
  vehicleId: string;
  performedBy: { id: string; name: string };
  type: 'TIRE_REPLACEMENT' | 'TIRE_REPAIR' | 'RETREADING_SEND_OFF' | 'RETREADING_RETURN' | 'OTHER';
  date: string;
  description: string | null;
  cost: number | null;
  tires: { id: string; brand: string; model: string }[];
  createdAt: string;
};
