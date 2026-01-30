import { Pool } from 'pg';
import { config } from '@/shared/config';

const poolConfig = config.databaseUrl
  ? { connectionString: config.databaseUrl }
  : {
      host: config.postgres.host,
      port: config.postgres.port,
      user: config.postgres.user,
      password: config.postgres.password,
      database: config.postgres.database
    };

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

export const pool = global.pgPool ?? new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') {
  global.pgPool = pool;
}
