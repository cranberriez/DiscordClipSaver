import "server-only";
import { Pool, type PoolConfig, type QueryResult } from "pg";
import { InstallIntent } from "./types";

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

export type UpsertUserParams = {
	discordUserId: string | bigint;
	username?: string | null;
	globalName?: string | null;
	avatar?: string | null;
};

export async function upsertUserLogin(params: UpsertUserParams): Promise<QueryResult> {
	const pool = getPool();
	const { discordUserId, username, globalName, avatar } = params;
	const normalizedDiscordUserId = typeof discordUserId === "bigint" ? discordUserId.toString() : discordUserId;
	return pool.query(
		`
			insert into users (discord_user_id, username, global_name, avatar, last_login_at)
			values ($1, $2, $3, $4, now())
			on conflict (discord_user_id) do update
			set username = excluded.username,
				global_name = excluded.global_name,
				avatar = excluded.avatar,
				last_login_at = excluded.last_login_at
		`,
		[normalizedDiscordUserId, username ?? null, globalName ?? null, avatar ?? null]
	);
}

export type UserRow = {
	id: number;
	discord_user_id: string; // bigint is returned as string by node-postgres
	username: string | null;
	global_name: string | null;
	avatar: string | null;
	last_login_at: Date | null;
};

export async function getUserByDiscordId(discordUserId: string): Promise<UserRow | null> {
	const pool = getPool();
	const res = await pool.query(
		`
			select id, discord_user_id, username, global_name, avatar, last_login_at
			from users
			where discord_user_id = $1
			limit 1
		`,
		[discordUserId]
	);
	return (res.rows?.[0] as UserRow | undefined) ?? null;
}

export type BotGuildRow = {
	guild_id: string;
	name: string;
	owner_user_id: string | null; // bigint from PG, returned as string by node-postgres
	joined_at: Date | null;
	last_seen_at: Date | null;
};

export async function getBotGuildsByIds(guildIds: string[]): Promise<BotGuildRow[]> {
	if (guildIds.length === 0) return [];
	const pool = getPool();
	const res = await pool.query(
		`
			select guild_id, name, owner_user_id, joined_at, last_seen_at
			from bot_guilds
			where guild_id = any($1)
		`,
		[guildIds]
	);
	return res.rows as BotGuildRow[];
}

export async function getBotGuildById(guildId: string): Promise<BotGuildRow | null> {
	const pool = getPool();
	const res = await pool.query(
		`
			select guild_id, name, owner_user_id, joined_at, last_seen_at
			from bot_guilds
			where guild_id = $1
			limit 1
		`,
		[guildId]
	);
	return (res.rows?.[0] as BotGuildRow | undefined) ?? null;
}

export async function createBotGuild(params: BotGuildRow): Promise<QueryResult> {
	const pool = getPool();
	return pool.query(
		`
			insert into bot_guilds (guild_id, name, owner_user_id, joined_at, last_seen_at)
			values ($1, $2, $3, $4, $5)
		`,
		[params.guild_id, params.name, params.owner_user_id, params.joined_at, params.last_seen_at]
	);
}

export async function setGuildOwnerIfUnclaimed(guildId: string, userId: string): Promise<boolean> {
	const pool = getPool();
	try {
		const res = await pool.query(
			`
				update bot_guilds
				set owner_user_id = $1
				where guild_id = $2
			and owner_user_id is null
		`,
			[userId, guildId]
		);
		return (res.rowCount ?? 0) > 0;
	} catch (error) {
		return false;
	}
}

export async function consumeInstallIntent(state: string): Promise<InstallIntent | null> {
	const pool = getPool();
	const res = await pool.query(
		`
            delete from install_intents
            where state = $1
            returning state, user_id, guild_id, created_at, expires_at
        `,
		[state]
	);

	return (res.rows?.[0] as InstallIntent | undefined) ?? null;
}

export async function createInstallIntent(params: {
	state: string;
	userId: string;
	guildId: string;
	expiresAt: Date;
}): Promise<InstallIntent> {
	const pool = getPool();
	const res = await pool.query(
		`
            insert into install_intents (state, user_id, guild_id, created_at, expires_at)
            values ($1, $2, $3, now(), $4)
            returning state, user_id, guild_id, created_at, expires_at
        `,
		[params.state, params.userId, params.guildId, params.expiresAt]
	);
	return res.rows[0] as InstallIntent;
}
