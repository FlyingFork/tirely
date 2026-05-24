import type { FastifyInstance } from 'fastify';

import { dailyAlgorithmRefresh } from './jobs/dailyAlgorithmRefresh.js';

type CronField = {
  min: number;
  max: number;
};

const DEFAULT_CRON = '0 3 * * *';
const MINUTE = 60_000;

export const registerScheduler = async (app: FastifyInstance) => {
  const cronExpression = process.env.USAGE_ALGORITHM_REFRESH_CRON ?? DEFAULT_CRON;

  if (!isValidCronExpression(cronExpression)) {
    app.log.error(
      { cronExpression },
      'Scheduler disabled: invalid USAGE_ALGORITHM_REFRESH_CRON expression',
    );
    return;
  }

  let startTimer: NodeJS.Timeout | null = null;
  let interval: NodeJS.Timeout | null = null;
  let isRunning = false;
  let lastRunKey: string | null = null;

  const tick = async () => {
    const now = new Date();
    if (!matchesCron(cronExpression, now)) return;

    const runKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    if (runKey === lastRunKey || isRunning) return;

    lastRunKey = runKey;
    isRunning = true;

    try {
      await dailyAlgorithmRefresh(app);
    } catch (err) {
      app.log.error({ err }, 'dailyAlgorithmRefresh: job execution failed');
    } finally {
      isRunning = false;
    }
  };

  const startLoop = () => {
    void tick();
    interval = setInterval(() => {
      void tick();
    }, MINUTE);
  };

  const delayUntilNextMinute = MINUTE - (Date.now() % MINUTE);
  startTimer = setTimeout(startLoop, delayUntilNextMinute);

  app.log.info({ cronExpression }, 'Scheduler registered for usage algorithm refresh');

  app.addHook('onClose', async () => {
    if (startTimer) clearTimeout(startTimer);
    if (interval) clearInterval(interval);
  });
};

const isValidCronExpression = (expression: string) => {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const fields: CronField[] = [
    { min: 0, max: 59 },
    { min: 0, max: 23 },
    { min: 1, max: 31 },
    { min: 1, max: 12 },
    { min: 0, max: 6 },
  ];

  return parts.every((part, index) => validateField(part, fields[index]!));
};

const matchesCron = (expression: string, date: Date) => {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = expression.trim().split(/\s+/);

  return (
    matchField(minute!, date.getMinutes(), { min: 0, max: 59 }) &&
    matchField(hour!, date.getHours(), { min: 0, max: 23 }) &&
    matchField(dayOfMonth!, date.getDate(), { min: 1, max: 31 }) &&
    matchField(month!, date.getMonth() + 1, { min: 1, max: 12 }) &&
    matchField(dayOfWeek!, date.getDay(), { min: 0, max: 6 })
  );
};

const validateField = (field: string, limits: CronField) => {
  const segments = field.split(',');
  return segments.every((segment) => validateSegment(segment, limits));
};

const matchField = (field: string, value: number, limits: CronField) => {
  return field.split(',').some((segment) => matchSegment(segment, value, limits));
};

const validateSegment = (segment: string, limits: CronField) => {
  if (segment === '*') return true;

  const [basePart, stepRaw] = segment.split('/');
  const base = basePart ?? '';
  if (stepRaw !== undefined) {
    const step = Number(stepRaw);
    if (!Number.isInteger(step) || step <= 0) return false;
  }

  if (base === '*') return true;

  if (base.includes('-')) {
    const range = base.split('-').map(Number);
    const start = range[0] ?? Number.NaN;
    const end = range[1] ?? Number.NaN;
    return (
      Number.isInteger(start) &&
      Number.isInteger(end) &&
      start >= limits.min &&
      end <= limits.max &&
      start <= end
    );
  }

  const exact = Number(base);
  return Number.isInteger(exact) && exact >= limits.min && exact <= limits.max;
};

const matchSegment = (segment: string, value: number, limits: CronField) => {
  if (!validateSegment(segment, limits)) return false;

  const [basePart, stepRaw] = segment.split('/');
  const base = basePart ?? '';
  const step = stepRaw !== undefined ? Number(stepRaw) : null;

  if (base === '*') {
    return step === null ? true : (value - limits.min) % step === 0;
  }

  const rangeValues = base.includes('-')
    ? base.split('-').map(Number)
    : [Number(base), Number(base)];
  const rangeStart = rangeValues[0] ?? limits.min;
  const rangeEnd = rangeValues[1] ?? limits.max;

  if (value < rangeStart || value > rangeEnd) return false;
  if (step === null) return true;

  return (value - rangeStart) % step === 0;
};
