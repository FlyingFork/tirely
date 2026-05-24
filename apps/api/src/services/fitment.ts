import { prisma } from '@tirely/database';

type TireSize = { width: number; aspectRatio: number; rimDiameter: number };

type Mismatch = {
  tireId: string;
  position: string;
  expectedSizes: TireSize[];
  actualSize: TireSize;
};

export const validateFitment = async (input: {
  vehicleId: string;
  assignments: { tireId: string; position: string }[];
}): Promise<Mismatch[]> => {
  const compatible = await prisma.vehicleCompatibleSize.findMany({
    where: { vehicleId: input.vehicleId },
  });
  const tires = await prisma.tire.findMany({
    where: { id: { in: input.assignments.map((a) => a.tireId) } },
    select: { id: true, width: true, aspectRatio: true, rimDiameter: true },
  });
  const tireById = new Map(tires.map((t) => [t.id, t]));
  const mismatches: Mismatch[] = [];

  for (const a of input.assignments) {
    const tire = tireById.get(a.tireId);
    if (!tire) continue;
    const positionAxle = positionToAxle(a.position);
    const allowed = compatible.filter(
      (c) => c.axlePosition === null || c.axlePosition === positionAxle || c.axlePosition === 'ANY',
    );
    if (allowed.length === 0) continue;
    const fits = allowed.some(
      (c) =>
        c.width === tire.width &&
        c.aspectRatio === tire.aspectRatio &&
        c.rimDiameter === tire.rimDiameter,
    );
    if (!fits) {
      mismatches.push({
        tireId: tire.id,
        position: a.position,
        expectedSizes: allowed.map(({ width, aspectRatio, rimDiameter }) => ({
          width,
          aspectRatio,
          rimDiameter,
        })),
        actualSize: {
          width: tire.width,
          aspectRatio: tire.aspectRatio,
          rimDiameter: tire.rimDiameter,
        },
      });
    }
  }
  return mismatches;
};

const positionToAxle = (p: string): string => {
  if (p === 'FRONT_LEFT' || p === 'FRONT_RIGHT') return 'FRONT';
  if (p === 'REAR_LEFT' || p === 'REAR_RIGHT') return 'REAR';
  if (p === 'SPARE') return 'SPARE';
  return 'ANY';
};
