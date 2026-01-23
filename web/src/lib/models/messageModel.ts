import { pool } from '@/lib/db';
import type { MessageRecord } from '@/lib/types/message';

export class MessageModel {
  static async getRecentMessagesByUser(
    userId: number,
    limit: number,
    lookbackDays: number
  ): Promise<MessageRecord[]> {
    const result = await pool.query<MessageRecord>(
      `SELECT text, sent_at
       FROM messages
       WHERE user_id = $1
         AND sent_at >= NOW() - ($2 || ' days')::interval
       ORDER BY sent_at DESC
       LIMIT $3`,
      [userId, lookbackDays, limit]
    );

    return result.rows;
  }
}
