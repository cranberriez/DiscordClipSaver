import "server-only";
import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from "pg";

type PoolSingleton = Pool & { _isInitialized?: boolean };
const globalForPg = globalThis as unknown as {
	pgPool?: PoolSingleton;
};

function resolvePoolConfig(): PoolConfig {
	const connectionString = process.env.DATABASE_URL;
	if (connectionString) {
		return { connectionString } satisfies PoolConfig;
	}

	const host = process.env.DB_HOST;
	const user = process.env.DB_USER;
	const password = process.env.DB_PASSWORD;
	const database = process.env.DB_NAME;
	const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;

	if (!host || !user || !password || !database) {
		throw new Error(
			"PostgreSQL configuration is missing. Provide DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME environment variables."
		);
	}

	return {
		host,
		user,
		password,
		database,
		port,
	} satisfies PoolConfig;
}

function createPool(): PoolSingleton {
	const pool = new Pool(resolvePoolConfig()) as PoolSingleton;
	pool._isInitialized = true;
	return pool;
}

function assertServerRuntime() {
	if (typeof window !== "undefined") throw new Error("DB access attempted in browser");
	if (process.env.NEXT_RUNTIME === "edge") throw new Error("DB not available in Edge runtime");
}

export function getPool(): Pool {
	assertServerRuntime();
	if (!globalForPg.pgPool || !globalForPg.pgPool._isInitialized) {
		globalForPg.pgPool = createPool();
	}
	return globalForPg.pgPool;
}

// Convenience wrapper following node-postgres project structure guide
export async function query<T extends QueryResultRow = QueryResultRow>(
	text: string,
	params?: any[]
): Promise<QueryResult<T>> {
	try {
		return await getPool().query<T>(text, params);
	} catch (err: unknown) {
		const anyErr = err as { code?: string } | undefined;
		if (anyErr?.code === "ECONNREFUSED") {
			// Small, targeted handler: log and rethrow a clearer error while preserving code
			console.error("[DB] Connection refused (ECONNREFUSED). Is PostgreSQL running and reachable?");
			const wrapped = new Error(
				"Database connection refused (ECONNREFUSED). Ensure PostgreSQL is running and reachable."
			) as Error & {
				code?: string;
				cause?: unknown;
			};
			wrapped.code = "ECONNREFUSED";
			wrapped.cause = err;
			throw wrapped;
		}
		throw err as Error;
	}
}

// Repository exports
export { upsertUserLogin, getUserByDiscordId } from "./users";
export { createBotGuild, getBotGuildsByIds, getBotGuildById, setGuildOwnerIfUnclaimed } from "./guilds";
export { createInstallIntent, consumeInstallIntent } from "./install_intents";
