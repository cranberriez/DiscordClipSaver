import { getPool } from "./index";
import { QueryResult } from "pg";

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
