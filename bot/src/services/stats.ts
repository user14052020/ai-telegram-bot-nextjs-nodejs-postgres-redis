import { MessageModel } from '@/models/messageModel.js';
import { getCache, setCache } from '@/services/cache.js';
import { config } from '@/config.js';
import { buildStatsCacheKey } from '@/utils/cacheKey.js';
import type { TimeRange, UserMessageCount, UserStats } from '@/types/message.js';
import type { TopUsersStats } from '@/types/stats.js';

export const getTopUsersStats = async (params: {
  chatId: number;
  range: TimeRange;
  rangeKey?: string | null;
}): Promise<TopUsersStats> => {
  const cacheKey = buildStatsCacheKey({
    scope: 'top',
    chatId: params.chatId,
    rangeKey: params.rangeKey,
    rangeStart: params.range.start ?? null,
    rangeEnd: params.range.end ?? null
  });

  const cached = await getCache<TopUsersStats>(cacheKey);
  if (cached) return cached;

  const users = await MessageModel.getTopUsers(params.chatId, params.range, 10);
  const totals = await MessageModel.getTotals(params.chatId, params.range);

  const payload = { users, totals };
  await setCache(cacheKey, payload, config.cacheTtlSeconds);
  return payload;
};

export const getUserStats = async (params: {
  chatId: number;
  userId: number;
  range: TimeRange;
  rangeKey?: string | null;
}): Promise<UserStats> => {
  const cacheKey = buildStatsCacheKey({
    scope: 'user',
    chatId: params.chatId,
    userId: params.userId,
    rangeKey: params.rangeKey,
    rangeStart: params.range.start ?? null,
    rangeEnd: params.range.end ?? null
  });

  const cached = await getCache<UserStats>(cacheKey);
  if (cached) return cached;

  const stats = await MessageModel.getUserStats(params.chatId, params.userId, params.range);
  await setCache(cacheKey, stats, config.cacheTtlSeconds);
  return stats;
};
