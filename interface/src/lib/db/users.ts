import { QueryResult } from "pg";
import { query } from "./index";
import { UpsertUserLoginSchema, type UpsertUserLogin, UserRowSchema, type UserRow } from "./schemas/users";

export type UpsertUserParams = UpsertUserLogin;

export async function upsertUserLogin(params: UpsertUserParams): Promise<QueryResult> {
    const valid = UpsertUserLoginSchema.parse(params);
    const normalizedDiscordUserId =
        typeof valid.discordUserId === "bigint" ? valid.discordUserId.toString() : valid.discordUserId;
    return query(
        `
            insert into users (discord_user_id, username, global_name, avatar, last_login_at)
            values ($1, $2, $3, $4, now())
            on conflict (discord_user_id) do update
            set username = excluded.username,
                global_name = excluded.global_name,
                avatar = excluded.avatar,
                last_login_at = excluded.last_login_at
        `,
        [normalizedDiscordUserId, valid.username ?? null, valid.globalName ?? null, valid.avatar ?? null]
    );
}

export type { UserRow };

export async function getUserByDiscordId(discordUserId: string): Promise<UserRow | null> {
    const res = await query(
        `
            select id, discord_user_id, username, global_name, avatar, last_login_at
            from users
            where discord_user_id = $1
            limit 1
        `,
        [discordUserId]
    );
    const row = res.rows?.[0];
    if (!row) return null;
    return UserRowSchema.parse(row);
}
