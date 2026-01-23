import type { RangeKey } from '@/types/range.js';
export type { RangeKey } from '@/types/range.js';

export const rangeLabels: Record<RangeKey, string> = {
  today: 'сегодня',
  week: 'неделю',
  month: 'месяц',
  all: 'все время',
  custom: 'выбранный период'
};

export const rangeButtonLabels: Record<Exclude<RangeKey, 'custom'>, string> = {
  today: 'За сегодня',
  week: 'За неделю',
  month: 'За месяц',
  all: 'За все время'
};

export const resolveRange = (key: RangeKey): { start: Date | null; end: Date | null } => {
  const now = new Date();

  switch (key) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end: null };
    }
    case 'week': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { start, end: null };
    }
    case 'month': {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { start, end: null };
    }
    case 'all':
    default:
      return { start: null, end: null };
  }
};

export const parseRangeKey = (value?: string | null): RangeKey | null => {
  if (!value) return null;
  const normalized = value.replace(/[^a-z]/gi, '').toLowerCase();
  if (normalized === 'today') return 'today';
  if (normalized === 'week') return 'week';
  if (normalized === 'month') return 'month';
  if (normalized === 'all') return 'all';
  return null;
};

const formatDate = (value?: Date | null): string => {
  if (!value) return '';
  return value.toISOString().slice(0, 10);
};

export const formatRangeLabel = (params: {
  rangeKey?: RangeKey | null;
  start?: Date | null;
  end?: Date | null;
}): string => {
  if (!params.rangeKey || params.rangeKey === 'all') return rangeLabels.all;
  if (params.rangeKey !== 'custom') return rangeLabels[params.rangeKey];
  const start = formatDate(params.start);
  const end = formatDate(params.end);
  if (start && end) return `с ${start} по ${end}`;
  if (start) return `с ${start}`;
  if (end) return `по ${end}`;
  return 'за выбранный период';
};
