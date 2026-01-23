import type { RangeKey } from '@/types/range.js';
import type { DateRangeInput } from '@/types/dateRange.js';

export interface StatsCommandArgs {
  username?: string | null;
  rangeKey?: RangeKey | null;
  customRange?: DateRangeInput | null;
}
