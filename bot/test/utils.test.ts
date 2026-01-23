import { describe, expect, it } from 'vitest';
import { formatUserLabel } from '@/utils/format.js';
import { parseStatsArgs } from '@/utils/parse.js';
import { buildStatsCacheKey } from '@/utils/cacheKey.js';
import { resolveRange } from '@/utils/range.js';

describe('formatUserLabel', () => {
  it('uses username when available', () => {
    expect(formatUserLabel({ username: 'john' })).toBe('@john');
  });

  it('falls back to first and last name', () => {
    expect(formatUserLabel({ first_name: 'Ivan', last_name: 'Petrov' })).toBe('Ivan Petrov');
  });
});

describe('parseStatsArgs', () => {
  it('parses username and range', () => {
    const result = parseStatsArgs('/stats @alice week');
    expect(result.username).toBe('@alice');
    expect(result.rangeKey).toBe('week');
  });
});

describe('buildStatsCacheKey', () => {
  it('builds deterministic cache keys', () => {
    const key = buildStatsCacheKey({
      scope: 'top',
      chatId: 42,
      rangeKey: 'week',
      rangeStart: new Date('2024-01-01'),
      rangeEnd: new Date('2024-01-07')
    });
    expect(key).toBe('stats:top:42:week:2024-01-01:2024-01-07');
  });
});

describe('resolveRange', () => {
  it('returns today range starting at midnight', () => {
    const range = resolveRange('today');
    expect(range.start).not.toBeNull();
    expect(range.start?.getHours()).toBe(0);
    expect(range.start?.getMinutes()).toBe(0);
  });
});
