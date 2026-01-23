import { MessageModel } from '@/models/messageModel.js';
import { getCache, setCache } from '@/services/cache.js';
import { config } from '@/config.js';
import { buildStatsCacheKey } from '@/utils/cacheKey.js';
import type { TimeRange } from '@/types/message.js';

const STOP_WORDS = new Set([
  'и', 'а', 'но', 'на', 'в', 'во', 'не', 'что', 'это', 'как', 'к', 'ко', 'по', 'за', 'с', 'со', 'я', 'ты', 'мы', 'вы', 'он', 'она', 'они',
  'the', 'and', 'for', 'but', 'with', 'this', 'that', 'was', 'are', 'you', 'your', 'not', 'have', 'from'
]);

const normalizeWord = (word: string): string => {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '')
    .trim();
};

export const getTopKeywords = async (params: {
  chatId: number;
  range: TimeRange;
  rangeKey?: string | null;
  limit?: number;
}): Promise<Array<{ word: string; count: number }>> => {
  const cacheKey = buildStatsCacheKey({
    scope: 'keywords',
    chatId: params.chatId,
    rangeKey: params.rangeKey,
    rangeStart: params.range.start ?? null,
    rangeEnd: params.range.end ?? null
  });

  const cached = await getCache<Array<{ word: string; count: number }>>(cacheKey);
  if (cached) return cached;

  const defaultRange = params.range.start || params.range.end
    ? params.range
    : { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: null };

  const messages = await MessageModel.getMessagesInChatByRange(
    params.chatId,
    defaultRange,
    1000
  );

  const counts = new Map<string, number>();
  for (const message of messages) {
    for (const raw of message.text.split(/\s+/)) {
      const word = normalizeWord(raw);
      if (word.length < 4 || STOP_WORDS.has(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  const sorted = Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, params.limit ?? 8);

  await setCache(cacheKey, sorted, config.cacheTtlSeconds);
  return sorted;
};
