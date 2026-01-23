import type { DateRangeInput } from '@/types/dateRange.js';

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const parseDateRange = (text: string | undefined | null): DateRangeInput | null => {
  if (!text) return null;
  const fromMatch = text.match(/from\s+(\d{4}-\d{2}-\d{2})/i);
  const toMatch = text.match(/to\s+(\d{4}-\d{2}-\d{2})/i);
  const start = parseDate(fromMatch?.[1]);
  const end = parseDate(toMatch?.[1]);
  if (!start && !end) return null;
  return { start, end };
};
