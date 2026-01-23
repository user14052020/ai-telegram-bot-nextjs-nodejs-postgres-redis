import { parseRangeKey } from '@/utils/range.js';
import { parseDateRange } from '@/utils/dateRange.js';
import type { RangeKey } from '@/types/range.js';
import type { StatsCommandArgs } from '@/types/parse.js';

export const parseStatsArgs = (text: string | undefined | null): StatsCommandArgs => {
  if (!text) return {};
  const parts = text.trim().split(/\s+/).slice(1);
  let username: string | null = null;
  let rangeKey: RangeKey | null = null;

  for (const part of parts) {
    if (part.startsWith('@')) {
      username = part;
      continue;
    }
    const parsedRange = parseRangeKey(part);
    if (parsedRange) {
      rangeKey = parsedRange;
    }
  }

  const customRange = parseDateRange(text);

  return { username, rangeKey, customRange };
};
