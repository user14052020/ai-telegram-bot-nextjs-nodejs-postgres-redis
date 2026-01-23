import pg from 'pg';
import type { PoolClient } from 'pg';
import { config } from '@/config.js';
import type { Queryable } from '@/types/db.js';

const { Pool } = pg;

const poolConfig = config.databaseUrl
  ? { connectionString: config.databaseUrl }
  : {
      host: config.postgres.host,
      port: config.postgres.port,
      user: config.postgres.user,
      password: config.postgres.password,
      database: config.postgres.database
    };

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected Postgres error', err);
});

export const withTransaction = async <T>(handler: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
