import { MessageModel } from '@/lib/models/messageModel';
import { UserModel } from '@/lib/models/userModel';
import { formatUserLabel } from '@/lib/utils/format';
import { generateWithGemini } from '@/lib/services/gemini';
import { ExternalServiceError, NotFoundError } from '@/lib/services/errors';
import { config } from '@/lib/config';

const buildPrompt = (params: {
  displayName: string;
  messageCount: number;
  averageLength: number;
  peakHours: string;
  messages: string[];
}): string => {
  return `Ты аналитик чатов. Проанализируй сообщения пользователя и дай краткий структурированный ответ на русском.

Формат ответа:
Стиль: ...
Темы: ...
Активность: ...
Тональность: ...
Частые слова/выражения: ...
Особенности: ...

Контекст:
Пользователь: ${params.displayName}
Количество сообщений: ${params.messageCount}
Средняя длина: ${params.averageLength} символов
Пиковые часы активности: ${params.peakHours}

Сообщения (последние):
${params.messages.join('\n')}
`;
};

const computeAverageLength = (messages: string[]): number => {
  if (messages.length === 0) return 0;
  const total = messages.reduce((sum, message) => sum + message.length, 0);
  return Math.round(total / messages.length);
};

const computePeakHours = (timestamps: Date[]): string => {
  if (timestamps.length === 0) return 'нет данных';
  const buckets = new Array(24).fill(0);
  for (const date of timestamps) {
    buckets[date.getHours()] += 1;
  }
  const top = buckets
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(({ hour }) => `${hour.toString().padStart(2, '0')}:00`);
  return top.join(', ');
};

const STOP_WORDS = new Set([
  'и', 'а', 'но', 'на', 'в', 'во', 'не', 'что', 'это', 'как', 'к', 'ко', 'по', 'за', 'с', 'со', 'я', 'ты', 'мы', 'вы', 'он', 'она', 'они',
  'the', 'and', 'for', 'but', 'with', 'this', 'that', 'was', 'are', 'you', 'your', 'not', 'have', 'from'
]);

const extractTopWords = (messages: string[], limit: number): string[] => {
  const counts = new Map<string, number>();
  for (const message of messages) {
    for (const raw of message.split(/\s+/)) {
      const word = raw.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '').trim();
      if (word.length < 4 || STOP_WORDS.has(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ word }) => word);
};

const buildFallbackAnalysis = (params: {
  averageLength: number;
  peakHours: string;
  messages: string[];
}): string => {
  const style = params.averageLength >= 80 ? 'Развернутые сообщения' : params.averageLength >= 30 ? 'Умеренно развернутые' : 'Короткие сообщения';
  const topWords = extractTopWords(params.messages, 6);
  const topics = topWords.length > 0 ? topWords.join(', ') : 'недостаточно данных';
  const frequent = topWords.length > 0 ? topWords.join(', ') : 'нет';
  const tone = 'недостаточно данных';
  const features = params.averageLength < 20 ? 'Короткие реплики' : 'Без явных особенностей';

  return [
    `Стиль: ${style}`,
    `Темы: ${topics}`,
    `Активность: ${params.peakHours}`,
    `Тональность: ${tone}`,
    `Частые слова/выражения: ${frequent}`,
    `Особенности: ${features}`
  ].join('\n');
};

const generateWithRetry = async (prompt: string, attempts = 2): Promise<string> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await generateWithGemini(prompt);
      if (response && response !== 'Gemini не вернул текст.') {
        return response;
      }
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) {
    console.warn('Gemini retry failed, using fallback.', lastError);
  }
  return '';
};

export const analyzeByUsername = async (username: string): Promise<{
  analysis: string;
  messageCount: number;
  displayName: string;
  lookbackDays: number;
}> => {
  const user = await UserModel.findByUsername(username);
  if (!user) {
    throw new NotFoundError('Пользователь не найден. Проверьте @username.');
  }

  const messages = await MessageModel.getRecentMessagesByUser(
    user.id,
    config.analyzeMessageLimit,
    config.analyzeLookbackDays
  );

  if (messages.length === 0) {
    return {
      analysis: 'Недостаточно сообщений для анализа.',
      messageCount: 0,
      displayName: formatUserLabel(user),
      lookbackDays: config.analyzeLookbackDays
    };
  }

  const messageTexts = messages.map((message) => message.text).reverse();
  const timestamps = messages.map((message) => new Date(message.sent_at));
  const averageLength = computeAverageLength(messageTexts);
  const peakHours = computePeakHours(timestamps);

  const prompt = buildPrompt({
    displayName: formatUserLabel(user),
    messageCount: messages.length,
    averageLength,
    peakHours,
    messages: messageTexts
  });

  let analysis: string;
  try {
    analysis = await generateWithRetry(prompt, 2);
  } catch (error) {
    console.error('Gemini error', error);
    throw new ExternalServiceError('Ошибка Gemini API. Проверьте ключ и лимиты.');
  }

  if (!analysis) {
    analysis = buildFallbackAnalysis({ averageLength, peakHours, messages: messageTexts });
  }

  return {
    analysis,
    messageCount: messages.length,
    displayName: formatUserLabel(user),
    lookbackDays: config.analyzeLookbackDays
  };
};
