import { QueryResult } from "pg";
import { getPool } from ".";

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
