export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function startOfMonth(date: Date): Date {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function getMonthWindowStart(months: number): Date {
  const start = startOfMonth(new Date());
  start.setMonth(start.getMonth() - months + 1);
  return start;
}

export function buildMonthKeys(months: number, start: Date): string[] {
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(start);
    date.setMonth(start.getMonth() + index);
    return monthKey(date);
  });
}

export function countDatesByMonth(dates: Date[]): Map<string, number> {
  const countsByMonth = new Map<string, number>();

  for (const date of dates) {
    const bucket = monthKey(date);
    countsByMonth.set(bucket, (countsByMonth.get(bucket) ?? 0) + 1);
  }

  return countsByMonth;
}

export function buildMonthlyCountRows(
  months: number,
  start: Date,
  countsByMonth: Map<string, number>,
): { month: string; count: number }[] {
  return buildMonthKeys(months, start).map((month) => ({
    month,
    count: countsByMonth.get(month) ?? 0,
  }));
}

export function buildMonthKeysBetween(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = startOfMonth(start);
  const last = startOfMonth(end);

  while (cursor <= last) {
    keys.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return keys;
}
