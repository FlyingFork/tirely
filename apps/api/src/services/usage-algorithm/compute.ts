import type {
  ComputeInput,
  ComputeOutput,
  FactorBreakdown,
  SafetyOverride,
  UsageStatus,
} from './types.js';

type FactorValues = {
  tread: number | null;
  mileage: number | null;
  age: number | null;
  condition: number | null;
};

type FactorWeights = {
  tread: number;
  mileage: number;
  age: number;
  condition: number;
};

type TreadComputation = {
  treadFactor: number | null;
  isEstimated: boolean;
  effectiveTreadDepth: number | null;
};

export const computeUsage = (input: ComputeInput): ComputeOutput => {
  const { tire, settings, now } = input;
  const lifespan = tire.expectedMileageLifespan ?? settings.defaultExpectedMileage;
  const { treadFactor, isEstimated, effectiveTreadDepth } = computeTreadFactor(input);

  const mileageFactor = lifespan > 0 ? clamp(tire.accumulatedMileage / lifespan, 0, 1) : null;

  const baseDate = tire.currentLifecycleStartDate ?? tire.purchaseDate;
  const ageMonths = Math.max(0, monthsBetween(baseDate, now));
  const ageFactor = clamp(ageMonths / settings.maximumAgeMonths, 0, 1);

  const conditionFactor =
    tire.latestCondition === 'NEEDS_REPLACEMENT'
      ? 1
      : tire.latestCondition === 'NEEDS_MONITORING'
        ? 0.5
        : tire.latestCondition === 'GOOD'
          ? 0
          : null;

  const factors: FactorValues = {
    tread: treadFactor,
    mileage: mileageFactor,
    age: ageFactor,
    condition: conditionFactor,
  };

  const weights = renormaliseWeights(factors, {
    tread: settings.treadWeight,
    mileage: settings.mileageWeight,
    age: settings.ageWeight,
    condition: settings.conditionWeight,
  });

  const composite =
    ((treadFactor !== null ? treadFactor * weights.tread : 0) +
      (mileageFactor !== null ? mileageFactor * weights.mileage : 0) +
      (ageFactor !== null ? ageFactor * weights.age : 0) +
      (conditionFactor !== null ? conditionFactor * weights.condition : 0)) *
    100;

  const overrides: Array<{ trigger: NonNullable<SafetyOverride>; floor: number }> = [];

  if (tire.latestCondition === 'NEEDS_REPLACEMENT') {
    overrides.push({ trigger: 'NEEDS_REPLACEMENT', floor: 95 });
  }
  if (tire.latestCondition === 'NEEDS_MONITORING') {
    overrides.push({ trigger: 'NEEDS_MONITORING', floor: 70 });
  }
  if (effectiveTreadDepth !== null && effectiveTreadDepth - settings.minimumTreadDepth < 1) {
    overrides.push({ trigger: 'TREAD_CRITICAL', floor: 90 });
  }
  if (ageMonths > settings.maximumAgeMonths) {
    overrides.push({ trigger: 'AGE_EXCEEDED', floor: 85 });
  }

  const highestOverride = overrides.sort((a, b) => b.floor - a.floor)[0] ?? null;
  const finalPercentage = highestOverride ? Math.max(composite, highestOverride.floor) : composite;
  const roundedPercentage = round(finalPercentage);

  return {
    percentage: roundedPercentage,
    status: bucketStatus(roundedPercentage),
    isEstimated,
    factors: factorBreakdownView(factors, weights),
    appliedOverride:
      highestOverride !== null && highestOverride.floor > composite
        ? highestOverride.trigger
        : null,
  };
};

export const computeTreadFactor = (input: ComputeInput): TreadComputation => {
  const { tire, settings, now } = input;

  if (tire.latestTreadDepth === null || tire.latestInspectionDate === null) {
    return {
      treadFactor: null,
      isEstimated: false,
      effectiveTreadDepth: null,
    };
  }

  const staleAt = addDays(tire.latestInspectionDate, settings.staleInspectionThresholdDays);
  const isStale = staleAt.getTime() < now.getTime();

  let effectiveTreadDepth = tire.latestTreadDepth;
  let isEstimated = false;

  if (isStale) {
    const distanceSinceInspection = Math.max(
      0,
      tire.accumulatedMileage - tire.mileageAtLastInspection,
    );
    const observedWearRate =
      tire.mileageAtLastInspection > 0 && tire.initialTreadDepth > tire.latestTreadDepth
        ? (tire.initialTreadDepth - tire.latestTreadDepth) / tire.mileageAtLastInspection
        : null;
    const wearRate =
      observedWearRate !== null && Number.isFinite(observedWearRate) && observedWearRate > 0
        ? observedWearRate
        : settings.defaultWearRate;

    effectiveTreadDepth = tire.latestTreadDepth - wearRate * distanceSinceInspection;
    isEstimated = true;
  }

  const usableTreadRange = tire.initialTreadDepth - settings.minimumTreadDepth;
  if (usableTreadRange <= 0) {
    return {
      treadFactor: null,
      isEstimated,
      effectiveTreadDepth,
    };
  }

  return {
    treadFactor: clamp((tire.initialTreadDepth - effectiveTreadDepth) / usableTreadRange, 0, 1),
    isEstimated,
    effectiveTreadDepth,
  };
};

export const renormaliseWeights = (
  factors: FactorValues,
  baseWeights: FactorWeights,
): FactorWeights => {
  const totalWeight =
    (factors.tread !== null ? baseWeights.tread : 0) +
    (factors.mileage !== null ? baseWeights.mileage : 0) +
    (factors.age !== null ? baseWeights.age : 0) +
    (factors.condition !== null ? baseWeights.condition : 0);

  if (totalWeight <= 0) {
    return { tread: 0, mileage: 0, age: 0, condition: 0 };
  }

  return {
    tread: factors.tread !== null ? baseWeights.tread / totalWeight : 0,
    mileage: factors.mileage !== null ? baseWeights.mileage / totalWeight : 0,
    age: factors.age !== null ? baseWeights.age / totalWeight : 0,
    condition: factors.condition !== null ? baseWeights.condition / totalWeight : 0,
  };
};

export const factorBreakdownView = (
  factors: FactorValues,
  weights: FactorWeights,
): FactorBreakdown => ({
  tread: { value: factors.tread, weight: weights.tread },
  mileage: { value: factors.mileage, weight: weights.mileage },
  age: { value: factors.age, weight: weights.age },
  condition: { value: factors.condition, weight: weights.condition },
});

export const bucketStatus = (percentage: number): UsageStatus =>
  percentage <= 25
    ? 'NEW'
    : percentage <= 50
      ? 'GOOD'
      : percentage <= 70
        ? 'MODERATE'
        : percentage <= 85
          ? 'HIGH'
          : percentage <= 94
            ? 'CRITICAL'
            : 'REPLACE_IMMEDIATELY';

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const round = (value: number) => Math.round(value * 10) / 10;

export const monthsBetween = (start: Date, end: Date) =>
  (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
