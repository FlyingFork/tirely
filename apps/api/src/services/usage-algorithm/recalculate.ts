import { prisma } from '@tirely/database';
import type { CompanySettings, Tire, TireEventType } from '@tirely/database';

import { computeUsage } from './compute.js';
import type { ComputeInput, ComputeOutput } from './types.js';

type TireForUsage = Pick<
  Tire,
  | 'id'
  | 'companyId'
  | 'status'
  | 'archived'
  | 'purchaseDate'
  | 'currentLifecycleStartDate'
  | 'expectedMileageLifespan'
  | 'initialTreadDepth'
  | 'latestTreadDepth'
  | 'latestCondition'
  | 'latestInspectionDate'
  | 'accumulatedMileage'
  | 'mileageAtLastInspection'
  | 'currentLifecycleNumber'
>;

type ActiveComputeContext = {
  tire: TireForUsage;
  accumulatedMileage: number;
  settings: CompanySettings;
  result: ComputeOutput;
};

const MILEAGE_EVENT_TYPES: TireEventType[] = ['MOUNTED', 'DISMOUNTED'];

export const recalculateUsageForTire = async (tireId: string): Promise<void> => {
  const context = await buildActiveComputeContext(tireId);
  if (!context) return;

  await persistUsageSnapshot(context);
};

export const recalculateUsageForVehicle = async (vehicleId: string): Promise<void> => {
  await refreshAccumulatedMileageForVehicle(vehicleId);

  const tires = await prisma.tire.findMany({
    where: { currentVehicleId: vehicleId, status: 'MOUNTED' },
    select: { id: true },
  });

  await Promise.all(
    tires.map(async (tire) => {
      const context = await buildActiveComputeContext(tire.id, { skipAccumulatedRefresh: true });
      if (!context) return;
      await persistUsageSnapshot(context);
    }),
  );
};

export const recalculateUsageForCompany = async (companyId: string): Promise<void> => {
  const tires = await prisma.tire.findMany({
    where: {
      companyId,
      archived: false,
      status: { not: 'DISPOSED' },
    },
    select: { id: true },
  });

  await Promise.all(tires.map((tire) => recalculateUsageForTire(tire.id)));
};

export const computeLiveUsageForTire = async (tireId: string): Promise<ComputeOutput | null> => {
  const context = await buildLiveComputeContext(tireId);
  return context?.result ?? null;
};

export const refreshAccumulatedMileageForVehicle = async (vehicleId: string): Promise<void> => {
  const mountedTires = await prisma.tire.findMany({
    where: { currentVehicleId: vehicleId, status: 'MOUNTED' },
    select: { id: true, currentLifecycleNumber: true },
  });

  await Promise.all(
    mountedTires.map(async (tire) => {
      const accumulatedMileage = await deriveAccumulatedMileageForLifecycle(
        tire.id,
        tire.currentLifecycleNumber,
      );
      await prisma.tire.update({
        where: { id: tire.id },
        data: { accumulatedMileage },
      });
    }),
  );
};

const buildActiveComputeContext = async (
  tireId: string,
  options: { skipAccumulatedRefresh?: boolean } = {},
): Promise<ActiveComputeContext | null> => {
  const tire = await findTireForUsage(tireId);
  if (!tire || tire.status === 'DISPOSED') return null;

  const settings = await getOrCreateCompanySettings(tire.companyId);
  const accumulatedMileage = options.skipAccumulatedRefresh
    ? tire.accumulatedMileage
    : await deriveAccumulatedMileageForLifecycle(tire.id, tire.currentLifecycleNumber);
  const result = computeUsage(toComputeInput(tire, settings, accumulatedMileage));

  return { tire, accumulatedMileage, settings, result };
};

const buildLiveComputeContext = async (tireId: string): Promise<ActiveComputeContext | null> => {
  const tire = await findTireForUsage(tireId);
  if (!tire) return null;

  const settings = await getOrCreateCompanySettings(tire.companyId);
  const accumulatedMileage = await deriveAccumulatedMileageForLifecycle(
    tire.id,
    tire.currentLifecycleNumber,
  );
  const result = computeUsage(toComputeInput(tire, settings, accumulatedMileage));

  return { tire, accumulatedMileage, settings, result };
};

const persistUsageSnapshot = async ({
  tire,
  accumulatedMileage,
  result,
}: ActiveComputeContext): Promise<void> => {
  await prisma.tire.update({
    where: { id: tire.id },
    data: {
      accumulatedMileage,
      usagePercentage: result.percentage,
      usageStatus: result.status,
      usageIsEstimated: result.isEstimated,
      usageCalculatedAt: new Date(),
    },
  });
};

const findTireForUsage = (tireId: string): Promise<TireForUsage | null> =>
  prisma.tire.findUnique({
    where: { id: tireId },
    select: {
      id: true,
      companyId: true,
      status: true,
      archived: true,
      purchaseDate: true,
      currentLifecycleStartDate: true,
      expectedMileageLifespan: true,
      initialTreadDepth: true,
      latestTreadDepth: true,
      latestCondition: true,
      latestInspectionDate: true,
      accumulatedMileage: true,
      mileageAtLastInspection: true,
      currentLifecycleNumber: true,
    },
  });

const getOrCreateCompanySettings = async (companyId: string) => {
  const settings = await prisma.companySettings.findUnique({ where: { companyId } });
  if (settings) return settings;
  return prisma.companySettings.create({ data: { companyId } });
};

const toComputeInput = (
  tire: TireForUsage,
  settings: CompanySettings,
  accumulatedMileage: number,
): ComputeInput => ({
  tire: {
    initialTreadDepth: tire.initialTreadDepth,
    accumulatedMileage,
    purchaseDate: tire.purchaseDate,
    currentLifecycleStartDate: tire.currentLifecycleStartDate,
    expectedMileageLifespan: tire.expectedMileageLifespan,
    latestTreadDepth: tire.latestTreadDepth,
    latestCondition: tire.latestCondition,
    latestInspectionDate: tire.latestInspectionDate,
    mileageAtLastInspection: tire.mileageAtLastInspection,
  },
  settings: {
    minimumTreadDepth: settings.minimumTreadDepth,
    maximumAgeMonths: settings.maximumAgeMonths,
    defaultExpectedMileage: settings.defaultExpectedMileage,
    defaultWearRate: settings.defaultWearRate,
    staleInspectionThresholdDays: settings.staleInspectionThresholdDays,
    treadWeight: settings.treadWeight,
    mileageWeight: settings.mileageWeight,
    ageWeight: settings.ageWeight,
    conditionWeight: settings.conditionWeight,
  },
  now: new Date(),
});

const deriveAccumulatedMileageForLifecycle = async (
  tireId: string,
  lifecycleNumber: number,
): Promise<number> => {
  const events = await prisma.tireEvent.findMany({
    where: {
      tireId,
      lifecycleNumber,
      eventType: { in: MILEAGE_EVENT_TYPES },
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    select: {
      eventType: true,
      odometerAt: true,
      vehicleId: true,
    },
  });

  let accumulated = 0;
  let openMount: { odometerAt: number; vehicleId: string | null } | null = null;

  for (const event of events) {
    if (event.eventType === 'MOUNTED') {
      if (event.odometerAt !== null) {
        openMount = { odometerAt: event.odometerAt, vehicleId: event.vehicleId };
      }
      continue;
    }

    if (event.eventType === 'DISMOUNTED' && openMount !== null && event.odometerAt !== null) {
      accumulated += Math.max(0, event.odometerAt - openMount.odometerAt);
      openMount = null;
    }
  }

  if (openMount?.vehicleId) {
    const latestEntry = await prisma.mileageEntry.findFirst({
      where: { vehicleId: openMount.vehicleId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: { odometer: true },
    });

    if (latestEntry) {
      accumulated += Math.max(0, latestEntry.odometer - openMount.odometerAt);
    }
  }

  return accumulated;
};
