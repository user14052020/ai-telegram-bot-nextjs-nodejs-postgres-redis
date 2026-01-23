import { pool } from '@/db.js';
import type { Queryable } from '@/types/db.js';
import type { MessageRecord, TimeRange, UserMessageCount, UserStats } from '@/types/message.js';

const rangeClause = (alias: string) =>
  `($2::timestamptz IS NULL OR ${alias}.sent_at >= $2)
   AND ($3::timestamptz IS NULL OR ${alias}.sent_at <= $3)`;

export class MessageModel {
  static async create(
    params: {
      chatId: number;
      userId: number;
      messageId: number;
      text: string;
      sentAt: Date;
    },
    db: Queryable = pool
  ): Promise<void> {
    await db.query(
      `INSERT INTO messages (chat_id, user_id, message_id, text, sent_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (chat_id, message_id) DO NOTHING`,
      [params.chatId, params.userId, params.messageId, params.text, params.sentAt]
    );
  }

  static async getTopUsers(
    chatId: number,
    range: TimeRange,
    limit = 10
  ): Promise<UserMessageCount[]> {
    const result = await pool.query<UserMessageCount>(
      `SELECT u.id as user_id,
              u.username,
              u.first_name,
              u.last_name,
              COUNT(m.id)::int AS message_count
       FROM messages m
       JOIN users u ON u.id = m.user_id
       WHERE m.chat_id = $1 AND ${rangeClause('m')}
       GROUP BY u.id, u.username, u.first_name, u.last_name
       ORDER BY message_count DESC
       LIMIT $4`,
      [chatId, range.start ?? null, range.end ?? null, limit]
    );

    return result.rows;
  }

  static async getTotals(chatId: number, range: TimeRange): Promise<{ messages: number; users: number }> {
    const result = await pool.query<{ messages: number; users: number }>(
      `SELECT COUNT(*)::int AS messages,
              COUNT(DISTINCT user_id)::int AS users
       FROM messages m
       WHERE m.chat_id = $1 AND ${rangeClause('m')}`,
      [chatId, range.start ?? null, range.end ?? null]
    );

    return result.rows[0] ?? { messages: 0, users: 0 };
  }

  static async getUserStats(chatId: number, userId: number, range: TimeRange): Promise<UserStats> {
    const result = await pool.query<UserStats>(
      `SELECT COUNT(*)::int AS message_count,
              MIN(sent_at) AS first_message,
              MAX(sent_at) AS last_message
       FROM messages m
       WHERE m.chat_id = $1 AND m.user_id = $2 AND ${rangeClause('m')}`,
      [chatId, range.start ?? null, range.end ?? null]
    );

    return result.rows[0] ?? { message_count: 0, first_message: null, last_message: null };
  }

  static async getRecentMessagesByUser(
    chatId: number,
    userId: number,
    limit: number,
    lookbackDays: number
  ): Promise<MessageRecord[]> {
    const result = await pool.query<MessageRecord>(
      `SELECT text, sent_at
       FROM messages
       WHERE chat_id = $1
         AND user_id = $2
         AND sent_at >= NOW() - ($3 || ' days')::interval
       ORDER BY sent_at DESC
       LIMIT $4`,
      [chatId, userId, lookbackDays, limit]
    );

    return result.rows;
  }

  static async getRecentMessagesInChat(
    chatId: number,
    limit: number,
    lookbackDays: number
  ): Promise<MessageRecord[]> {
    const result = await pool.query<MessageRecord>(
      `SELECT text, sent_at
       FROM messages
       WHERE chat_id = $1
         AND sent_at >= NOW() - ($2 || ' days')::interval
       ORDER BY sent_at DESC
       LIMIT $3`,
      [chatId, lookbackDays, limit]
    );

    return result.rows;
  }

  static async getMessagesInChatByRange(
    chatId: number,
    range: TimeRange,
    limit: number
  ): Promise<MessageRecord[]> {
    const result = await pool.query<MessageRecord>(
      `SELECT text, sent_at
       FROM messages m
       WHERE m.chat_id = $1 AND ${rangeClause('m')}
       ORDER BY sent_at DESC
       LIMIT $4`,
      [chatId, range.start ?? null, range.end ?? null, limit]
    );

    return result.rows;
  }
}
