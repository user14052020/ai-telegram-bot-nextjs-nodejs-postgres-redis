import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCacheMock = vi.fn();
const setCacheMock = vi.fn();
const getTopUsersMock = vi.fn();
const getTotalsMock = vi.fn();
const getUserStatsMock = vi.fn();

vi.mock('@/services/cache.js', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock
}));

vi.mock('@/models/messageModel.js', () => ({
  MessageModel: {
    getTopUsers: getTopUsersMock,
    getTotals: getTotalsMock,
    getUserStats: getUserStatsMock
  }
}));

vi.mock('@/config.js', () => ({
  config: {
    cacheTtlSeconds: 1200
  }
}));

import { getTopUsersStats, getUserStats } from '@/services/stats.js';

describe('stats service caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached top users stats without hitting the database', async () => {
    const cached = {
      users: [{ user_id: 1, username: 'alice', first_name: 'Alice', last_name: null, message_count: 10 }],
      totals: { messages: 10, users: 1 }
    };
    getCacheMock.mockResolvedValueOnce(cached);

    const result = await getTopUsersStats({ chatId: 42, range: { start: null, end: null }, rangeKey: 'all' });

    expect(result).toEqual(cached);
    expect(getTopUsersMock).not.toHaveBeenCalled();
    expect(getTotalsMock).not.toHaveBeenCalled();
    expect(setCacheMock).not.toHaveBeenCalled();
  });

  it('computes and caches top users stats on cache miss', async () => {
    getCacheMock.mockResolvedValueOnce(null);
    const users = [
      { user_id: 1, username: 'alice', first_name: 'Alice', last_name: null, message_count: 10 }
    ];
    const totals = { messages: 10, users: 1 };
    getTopUsersMock.mockResolvedValueOnce(users);
    getTotalsMock.mockResolvedValueOnce(totals);

    const result = await getTopUsersStats({ chatId: 42, range: { start: null, end: null }, rangeKey: 'all' });

    expect(getTopUsersMock).toHaveBeenCalledWith(42, { start: null, end: null }, 10);
    expect(getTotalsMock).toHaveBeenCalledWith(42, { start: null, end: null });
    expect(result).toEqual({ users, totals });
    expect(setCacheMock).toHaveBeenCalledTimes(1);
    expect(setCacheMock.mock.calls[0][2]).toBe(1200);
  });

  it('computes and caches user stats on cache miss', async () => {
    getCacheMock.mockResolvedValueOnce(null);
    const stats = { message_count: 5, first_message: null, last_message: null };
    getUserStatsMock.mockResolvedValueOnce(stats);

    const result = await getUserStats({
      chatId: 42,
      userId: 7,
      range: { start: null, end: null },
      rangeKey: 'all'
    });

    expect(getUserStatsMock).toHaveBeenCalledWith(42, 7, { start: null, end: null });
    expect(result).toEqual(stats);
    expect(setCacheMock).toHaveBeenCalledTimes(1);
    expect(setCacheMock.mock.calls[0][2]).toBe(1200);
  });
});
