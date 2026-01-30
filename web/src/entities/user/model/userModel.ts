import { pool } from '@/shared/lib/db';
import type { UserRecord } from '@/entities/user/model/types';

export class UserModel {
  static async findByUsername(username: string): Promise<UserRecord | null> {
    const normalized = username.replace(/^@/, '').toLowerCase();
    const result = await pool.query<UserRecord>(
      'SELECT id, tg_id, username, first_name, last_name FROM users WHERE LOWER(username) = $1',
      [normalized]
    );

    return result.rows[0] ?? null;
  }
}
