import { Telegraf, Markup } from 'telegraf';
import { config } from '@/config.js';
import { connectRedis } from '@/services/cache.js';
import { ChatModel } from '@/models/chatModel.js';
import { UserModel } from '@/models/userModel.js';
import { ingestMessage } from '@/services/ingest.js';
import { getTopUsersStats, getUserStats } from '@/services/stats.js';
import { analyzeUserMessages } from '@/services/analysis.js';
import { formatCount, formatUserLabel } from '@/utils/format.js';
import { formatRangeLabel, rangeButtonLabels, resolveRange, RangeKey } from '@/utils/range.js';
import { parseStatsArgs } from '@/utils/parse.js';
import { getTopKeywords } from '@/services/keywords.js';

const isGroupChat = (type?: string): boolean => type === 'group' || type === 'supergroup';

const getGroupTitle = (chat: { type?: string; title?: string } | undefined): string | null => {
  if (!chat || !isGroupChat(chat.type)) return null;
  return chat.title ?? null;
};

const getGroupId = (chat: { type?: string; id?: number } | undefined): number | null => {
  if (!chat || !isGroupChat(chat.type)) return null;
  return typeof chat.id === 'number' ? chat.id : null;
};

const buildStatsKeyboard = (rangeKey: RangeKey) => {
  const buttons = Object.entries(rangeButtonLabels).map(([key, label]) =>
    Markup.button.callback(label, `stats:top:${key}`)
  );

  return Markup.inlineKeyboard([
    buttons,
    [Markup.button.callback('Статистика пользователя', `stats:pickuser:${rangeKey}`)]
  ]);
};

const buildUserListKeyboard = (rangeKey: RangeKey, users: { user_id: number; username: string | null; first_name: string | null; last_name: string | null }[]) => {
  const rows = users.map((user) => [
    Markup.button.callback(formatUserLabel(user), `stats:user:${rangeKey}:${user.user_id}`)
  ]);
  return Markup.inlineKeyboard(rows);
};

const formatTopUsersText = (params: {
  rangeLabel: string;
  users: { username: string | null; first_name: string | null; last_name: string | null; message_count: number }[];
  totals: { messages: number; users: number };
}) => {
  if (params.users.length === 0) {
    return `Статистика чата за ${params.rangeLabel}:\n\nПока нет данных.`;
  }

  const lines = params.users.map((user, index) =>
    `${index + 1}. ${formatUserLabel(user)} - ${formatCount(user.message_count)} сообщений`
  );

  return [
    `Статистика чата за ${params.rangeLabel}:`,
    '',
    ...lines,
    '',
    `Всего: ${formatCount(params.totals.messages)} сообщений от ${formatCount(params.totals.users)} пользователей`
  ].join('\n');
};

const formatUserStatsText = (params: {
  rangeLabel: string;
  userLabel: string;
  stats: { message_count: number; first_message: Date | null; last_message: Date | null };
}) => {
  const first = params.stats.first_message
    ? new Date(params.stats.first_message).toLocaleString('ru-RU')
    : 'нет данных';
  const last = params.stats.last_message
    ? new Date(params.stats.last_message).toLocaleString('ru-RU')
    : 'нет данных';

  return [
    `Статистика пользователя ${params.userLabel} за ${params.rangeLabel}:`,
    '',
    `Сообщений: ${formatCount(params.stats.message_count)}`,
    `Первое сообщение: ${first}`,
    `Последнее сообщение: ${last}`
  ].join('\n');
};

const formatKeywordsText = (params: { rangeLabel: string; keywords: Array<{ word: string; count: number }> }) => {
  if (params.keywords.length === 0) {
    return `Топ-слов за ${params.rangeLabel}:\n\nПока нет данных.`;
  }

  const lines = params.keywords.map((item, index) => `${index + 1}. ${item.word} — ${item.count}`);
  return [`Топ-слов за ${params.rangeLabel}:`, '', ...lines].join('\n');
};

const botToken = config.botToken;
if (!botToken) {
  throw new Error('BOT_TOKEN is required');
}

const bot = new Telegraf(botToken);

bot.on('text', async (ctx, next) => {
  if (!ctx.message || !ctx.from || ctx.from.is_bot) {
    return next?.();
  }
  if (!isGroupChat(ctx.chat?.type)) {
    return next?.();
  }

  const chatId = getGroupId(ctx.chat);
  if (!chatId) {
    return next?.();
  }
  const chatTitle = getGroupTitle(ctx.chat);
  await ingestMessage({
    chatId,
    chatTitle,
    userId: ctx.from.id,
    username: ctx.from.username ?? null,
    firstName: ctx.from.first_name ?? null,
    lastName: ctx.from.last_name ?? null,
    messageId: ctx.message.message_id,
    text: ctx.message.text,
    sentAt: new Date(ctx.message.date * 1000)
  });

  return next?.();
});

bot.command('stats', async (ctx) => {
  if (!isGroupChat(ctx.chat?.type)) {
    await ctx.reply('Эта команда доступна только в групповых чатах.');
    return;
  }

  const args = parseStatsArgs(ctx.message?.text);
  const rangeKey = args.customRange ? 'custom' : args.rangeKey ?? 'all';
  const range = args.customRange ?? resolveRange(rangeKey === 'custom' ? 'all' : rangeKey);
  const rangeLabel = formatRangeLabel({ rangeKey, start: range.start, end: range.end });
  const keyboardRangeKey = rangeKey === 'custom' ? 'all' : rangeKey;
  const chatId = getGroupId(ctx.chat);
  if (!chatId) {
    await ctx.reply('Не удалось определить чат.');
    return;
  }

  if (args.username) {
    const user = await UserModel.findByUsername(args.username);
    if (!user) {
      await ctx.reply('Пользователь не найден. Попробуйте указать @username.');
      return;
    }
    const stats = await getUserStats({
      chatId: (await ChatModel.upsert(String(chatId), getGroupTitle(ctx.chat))).id,
      userId: user.id,
      range,
      rangeKey
    });

    const text = formatUserStatsText({
      rangeLabel,
      userLabel: formatUserLabel(user),
      stats
    });

    await ctx.reply(text);
    return;
  }

  const chat = await ChatModel.upsert(String(chatId), getGroupTitle(ctx.chat));
  const result = await getTopUsersStats({ chatId: chat.id, range, rangeKey });
  const text = formatTopUsersText({ rangeLabel, users: result.users, totals: result.totals });

  await ctx.reply(text, buildStatsKeyboard(keyboardRangeKey));
});

bot.command('analyze', async (ctx) => {
  if (!isGroupChat(ctx.chat?.type)) {
    await ctx.reply('Эта команда доступна только в групповых чатах.');
    return;
  }

  const text = ctx.message?.text ?? '';
  const parts = text.trim().split(/\s+/).slice(1);
  const usernameArg = parts.find((part) => part.startsWith('@')) ?? null;

  let user = null;
  if (usernameArg) {
    user = await UserModel.findByUsername(usernameArg);
  } else if (ctx.message?.reply_to_message?.from) {
    const replyFrom = ctx.message.reply_to_message.from;
    user = await UserModel.findByTelegramId(String(replyFrom.id));
  }

  if (!user) {
    await ctx.reply('Укажите @username или сделайте reply на сообщение пользователя.');
    return;
  }

  const chatId = getGroupId(ctx.chat);
  if (!chatId) {
    await ctx.reply('Не удалось определить чат.');
    return;
  }
  const chat = await ChatModel.upsert(String(chatId), getGroupTitle(ctx.chat));

  try {
    const result = await analyzeUserMessages({
      chatId: chat.id,
      userId: user.id,
      displayName: formatUserLabel(user)
    });

    const replyText = [
      `Анализ пользователя ${formatUserLabel(user)}`,
      '',
      result.analysis,
      '',
      `На основе ${formatCount(result.messageCount)} сообщений за последние ${result.lookbackDays} дней.`
    ].join('\n');

    await ctx.reply(replyText);
  } catch (error) {
    console.error('Analyze error', error);
    await ctx.reply('Не удалось получить анализ. Проверьте GEMINI_API_KEY.');
  }
});

bot.command('keywords', async (ctx) => {
  if (!isGroupChat(ctx.chat?.type)) {
    await ctx.reply('Эта команда доступна только в групповых чатах.');
    return;
  }

  const args = parseStatsArgs(ctx.message?.text);
  const rangeKey = args.customRange ? 'custom' : args.rangeKey ?? 'all';
  const range = args.customRange ?? resolveRange(rangeKey === 'custom' ? 'all' : rangeKey);
  const rangeLabel = formatRangeLabel({ rangeKey, start: range.start, end: range.end });

  const chatId = getGroupId(ctx.chat);
  if (!chatId) {
    await ctx.reply('Не удалось определить чат.');
    return;
  }
  const chat = await ChatModel.upsert(String(chatId), getGroupTitle(ctx.chat));
  const keywords = await getTopKeywords({ chatId: chat.id, range, rangeKey, limit: 8 });

  await ctx.reply(formatKeywordsText({ rangeLabel, keywords }));
});

bot.on('callback_query', async (ctx) => {
  const data = 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
  if (!data) return;

  const [scope, action, rangeKey, userId] = data.split(':');
  if (scope !== 'stats') return;

  const range = resolveRange((rangeKey as RangeKey) ?? 'all');
  const rangeLabel = formatRangeLabel({ rangeKey: rangeKey as RangeKey, start: range.start, end: range.end });

  if (!isGroupChat(ctx.chat?.type)) {
    await ctx.answerCbQuery();
    return;
  }

  const chatId = getGroupId(ctx.chat);
  if (!chatId) {
    await ctx.answerCbQuery('Не удалось определить чат.');
    return;
  }
  const chat = await ChatModel.upsert(String(chatId), getGroupTitle(ctx.chat));

  if (action === 'top') {
    const result = await getTopUsersStats({ chatId: chat.id, range, rangeKey });
    const text = formatTopUsersText({ rangeLabel, users: result.users, totals: result.totals });
    await ctx.editMessageText(text, buildStatsKeyboard(rangeKey as RangeKey));
    await ctx.answerCbQuery();
    return;
  }

  if (action === 'pickuser') {
    const result = await getTopUsersStats({ chatId: chat.id, range, rangeKey });
    const keyboard = buildUserListKeyboard(rangeKey as RangeKey, result.users);
    await ctx.reply('Выберите пользователя из списка или введите /stats @username.', keyboard);
    await ctx.answerCbQuery();
    return;
  }

  if (action === 'user' && userId) {
    const user = await UserModel.findById(Number(userId));
    if (!user) {
      await ctx.answerCbQuery('Пользователь не найден.');
      return;
    }
    const stats = await getUserStats({ chatId: chat.id, userId: user.id, range, rangeKey });
    const text = formatUserStatsText({
      rangeLabel,
      userLabel: formatUserLabel(user),
      stats
    });
    await ctx.reply(text);
    await ctx.answerCbQuery();
  }
});

bot.catch((err) => {
  console.error('Bot error', err);
});

const start = async () => {
  await connectRedis();
  await bot.launch();
  console.log('Bot started');
};

start();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
