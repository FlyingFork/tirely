export type ApiMileageEntry = {
  id: string;
  vehicleId: string;
  recordedBy: { id: string; name: string };
  odometer: number;
  date: string;
  createdAt: string;
};
