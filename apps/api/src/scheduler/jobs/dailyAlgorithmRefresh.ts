import { prisma } from '@tirely/database';

import { recalculateUsageForTire } from '../../services/usage-algorithm/recalculate.js';

type RefreshLogger = {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

type RefreshCounters = {
  recalculatedTires: number;
  failedTires: number;
};

const ACTIVE_TIRE_SELECT = { id: true } as const;


async function loadActiveTireIds() {
  return prisma.tire.findMany({
    where: { status: { not: 'DISPOSED' }, archived: false },
    select: ACTIVE_TIRE_SELECT,
  });
}



async function refreshSingleTire(tireId: string, log: RefreshLogger): Promise<boolean> {
  try {
    await recalculateUsageForTire(tireId);
    return true;
  } catch (err) {
    log.error({ err, tireId }, 'dailyAlgorithmRefresh: tire recalc failed');
    return false;
  }
}


async function refreshActiveTires(log: RefreshLogger): Promise<RefreshCounters> {
  const activeTires = await loadActiveTireIds();
  const counters: RefreshCounters = { recalculatedTires: 0, failedTires: 0 };

  for (const tire of activeTires) {
    const recalculated = await refreshSingleTire(tire.id, log);
    counters[recalculated ? 'recalculatedTires' : 'failedTires'] += 1;
  }

  return counters;
}


export const dailyAlgorithmRefresh = async (app: {
  log: RefreshLogger;
}): Promise<void> => {
  app.log.info('dailyAlgorithmRefresh: starting');
  const startedAt = Date.now();
  const refreshResult = await refreshActiveTires(app.log);

  app.log.info(
    {
      ok: refreshResult.recalculatedTires,
      failed: refreshResult.failedTires,
      ms: Date.now() - startedAt,
    },
    'dailyAlgorithmRefresh: done',
  );
};
