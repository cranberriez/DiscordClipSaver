import "server-only";
import { Pool, type PoolConfig } from "pg";

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

export function getPool(): Pool {
	if (!globalForPg.pgPool || !globalForPg.pgPool._isInitialized) {
		globalForPg.pgPool = createPool();
	}
	return globalForPg.pgPool;
}

// Repository exports
export { upsertUserLogin, getUserByDiscordId } from "./users";
export { createBotGuild, getBotGuildsByIds, getBotGuildById, setGuildOwnerIfUnclaimed } from "./guilds";
export { createInstallIntent, consumeInstallIntent } from "./install_intents";
