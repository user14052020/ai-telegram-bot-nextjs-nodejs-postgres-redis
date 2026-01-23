import type { Pool as PgPool } from 'pg';

export type Queryable = Pick<PgPool, 'query'>;
