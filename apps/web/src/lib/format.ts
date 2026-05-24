const LOCALE = 'en-GB';
const NUMBER_FORMAT = new Intl.NumberFormat(LOCALE);
const DECIMAL_FORMAT = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const MONTH_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});

export const formatDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export const formatDateTime = (iso: string | Date) =>
  new Date(iso).toLocaleString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatInteger = (value: number) => NUMBER_FORMAT.format(value);

export const formatNumber = (value: number) => DECIMAL_FORMAT.format(value);

export const formatMonth = (month: string) => {
  const [year, monthNumber] = month.split('-');
  const parsedYear = Number(year);
  const parsedMonth = Number(monthNumber);

  if (!parsedYear || !parsedMonth) return month;

  return MONTH_FORMAT.format(new Date(Date.UTC(parsedYear, parsedMonth - 1, 1)));
};
