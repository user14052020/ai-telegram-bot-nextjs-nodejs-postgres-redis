import { pool } from '@/db.js';
import type { Queryable } from '@/types/db.js';
import type { ChatRecord } from '@/types/chat.js';

export class ChatModel {
  static async upsert(tgId: string, title?: string | null, db: Queryable = pool): Promise<ChatRecord> {
    const result = await db.query<ChatRecord>(
      `INSERT INTO chats (tg_id, title)
       VALUES ($1, $2)
       ON CONFLICT (tg_id)
       DO UPDATE SET title = EXCLUDED.title
       RETURNING id, tg_id, title`,
      [tgId, title ?? null]
    );

    return result.rows[0];
  }

  static async findByTelegramId(tgId: string, db: Queryable = pool): Promise<ChatRecord | null> {
    const result = await db.query<ChatRecord>(
      'SELECT id, tg_id, title FROM chats WHERE tg_id = $1',
      [tgId]
    );

    return result.rows[0] ?? null;
  }
}
