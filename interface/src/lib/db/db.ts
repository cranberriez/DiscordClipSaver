// interface/src/lib/db/index.ts
import "server-only";
import { Kysely, PostgresDialect } from "kysely";
import { Pool, type PoolConfig } from "pg";
import type { DB } from "./schemas/db";

type PoolSingleton = Pool & { _isInitialized?: boolean };
type DbSingleton = Kysely<DB> & { _isInitialized?: boolean };

const globalForDb = globalThis as unknown as {
  pgPool?: PoolSingleton;
  db?: DbSingleton;
};

function resolvePoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) return { connectionString };
  const host = process.env.DB_HOST!;
  const user = process.env.DB_USER!;
  const password = process.env.DB_PASSWORD!;
  const database = process.env.DB_NAME!;
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;
  return { host, user, password, database, port };
}

function assertServerRuntime() {
  if (typeof window !== "undefined") throw new Error("DB access attempted in browser");
  if (process.env.NEXT_RUNTIME === "edge") throw new Error("DB not available in Edge runtime");
}

function getPool(): Pool {
  assertServerRuntime();
  if (!globalForDb.pgPool || !globalForDb.pgPool._isInitialized) {
    const pool = new Pool(resolvePoolConfig()) as PoolSingleton;
    pool._isInitialized = true;
    globalForDb.pgPool = pool;
  }
  return globalForDb.pgPool;
}

export function getDb(): Kysely<DB> {
  assertServerRuntime();
  if (!globalForDb.db || !globalForDb.db._isInitialized) {
    const db = new Kysely<DB>({ dialect: new PostgresDialect({ pool: getPool() }) }) as DbSingleton;
    db._isInitialized = true;
    globalForDb.db = db;
  }
  return globalForDb.db;
}

// Optional: keep raw pg compatibility
export const db = getDb();