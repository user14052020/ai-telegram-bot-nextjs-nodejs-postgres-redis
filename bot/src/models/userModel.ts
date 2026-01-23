import { pool } from '@/db.js';
import type { Queryable } from '@/types/db.js';
import type { UserRecord } from '@/types/user.js';

export class UserModel {
  static async upsert(
    params: {
      tgId: string;
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    },
    db: Queryable = pool
  ): Promise<UserRecord> {
    const result = await db.query<UserRecord>(
      `INSERT INTO users (tg_id, username, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tg_id)
       DO UPDATE SET username = EXCLUDED.username,
                     first_name = EXCLUDED.first_name,
                     last_name = EXCLUDED.last_name
       RETURNING id, tg_id, username, first_name, last_name`,
      [params.tgId, params.username ?? null, params.firstName ?? null, params.lastName ?? null]
    );

    return result.rows[0];
  }

  static async findByTelegramId(tgId: string, db: Queryable = pool): Promise<UserRecord | null> {
    const result = await db.query<UserRecord>(
      'SELECT id, tg_id, username, first_name, last_name FROM users WHERE tg_id = $1',
      [tgId]
    );

    return result.rows[0] ?? null;
  }

  static async findById(id: number, db: Queryable = pool): Promise<UserRecord | null> {
    const result = await db.query<UserRecord>(
      'SELECT id, tg_id, username, first_name, last_name FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0] ?? null;
  }

  static async findByUsername(username: string, db: Queryable = pool): Promise<UserRecord | null> {
    const normalized = username.replace(/^@/, '').toLowerCase();
    const result = await db.query<UserRecord>(
      'SELECT id, tg_id, username, first_name, last_name FROM users WHERE LOWER(username) = $1',
      [normalized]
    );

    return result.rows[0] ?? null;
  }
}
