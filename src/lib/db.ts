// MariaDB connection pool singleton + a strictly-parameterized query helper.
//
// Security: every query MUST be parameterized. `query()` takes a SQL string with
// `?` placeholders and a params array; user input is NEVER string-interpolated
// into SQL. `multipleStatements` stays OFF so a single `?` can never smuggle a
// stacked statement.
//
// The pool is cached on globalThis so Next.js dev hot-reloads (and multiple
// route-handler module instances) reuse one pool instead of leaking connections.
//
// Server-only by nature (imports `mariadb`). Also imported by the standalone
// node scripts, so it must NOT import the `server-only` package.

import { createPool as mariadbCreatePool } from "mariadb";
import type { Pool, PoolConnection } from "mariadb";
import { env } from "./env";

declare global {
  var __auraRoadmapDbPool: Pool | undefined;
}

function createPool(): Pool {
  return mariadbCreatePool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    connectionLimit: 10,
    // Predictable JS types: BIGINT (log PKs) and DECIMAL come back as numbers.
    // Domain PKs are CHAR(36) so they are plain strings anyway.
    bigIntAsNumber: true,
    decimalAsNumber: true,
    // Never allow stacked queries.
    multipleStatements: false,
    // Fail fast rather than hang a request forever.
    acquireTimeout: 10_000,
    charset: "utf8mb4",
    allowPublicKeyRetrieval: false,
  });
}

export function getPool(): Pool {
  if (!globalThis.__auraRoadmapDbPool) {
    globalThis.__auraRoadmapDbPool = createPool();
  }
  return globalThis.__auraRoadmapDbPool;
}

/**
 * Run a parameterized query. `sql` must use `?` placeholders for ALL dynamic
 * values. Returns rows typed as T[].
 *
 * @example
 *   const rows = await query<{ id: string }>(
 *     "SELECT id FROM app_users WHERE email = ?",
 *     [email],
 *   );
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: ReadonlyArray<unknown> = [],
): Promise<T[]> {
  const rows = await getPool().query(sql, params as unknown[]);
  return rows as T[];
}

/** Result metadata returned by a mutation. */
export interface ExecuteResult {
  affectedRows: number;
  insertId: number;
  warningStatus: number;
}

/**
 * Run a single mutation and return the driver result metadata
 * (affectedRows, insertId, …).
 */
export async function execute(
  sql: string,
  params: ReadonlyArray<unknown> = [],
): Promise<ExecuteResult> {
  const res = await getPool().query(sql, params as unknown[]);
  return res as unknown as ExecuteResult;
}

/**
 * Acquire a dedicated connection for a transaction. The caller MUST release it.
 * Prefer `withTransaction` for automatic commit/rollback/release.
 */
export async function getConnection(): Promise<PoolConnection> {
  return getPool().getConnection();
}

/** Run `fn` in a transaction, committing on success and rolling back on error. */
export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* ignore rollback error, surface the original */
    }
    throw err;
  } finally {
    conn.release();
  }
}

/** Lightweight DB health check used by /api/health. */
export async function pingDb(): Promise<boolean> {
  try {
    const rows = await query<{ ok: number }>("SELECT 1 AS ok");
    return rows[0]?.ok === 1;
  } catch {
    return false;
  }
}
