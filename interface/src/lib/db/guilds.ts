import { QueryResult } from "pg";
import { query } from ".";
import {
    BotGuildRowSchema,
    type BotGuildRow,
    CreateBotGuildSchema,
    type CreateBotGuild,
} from "./schemas/guilds";

export async function getBotGuildsByIds(guildIds: string[]): Promise<BotGuildRow[]> {
    if (guildIds.length === 0) return [];
    const res = await query(
        `
            select guild_id, name, owner_user_id, joined_at, last_seen_at
            from bot_guilds
            where guild_id = any($1)
        `,
        [guildIds]
    );
    return BotGuildRowSchema.array().parse(res.rows);
}

export async function getBotGuildById(guildId: string): Promise<BotGuildRow | null> {
    const res = await query(
        `
            select guild_id, name, owner_user_id, joined_at, last_seen_at
            from bot_guilds
            where guild_id = $1
            limit 1
        `,
        [guildId]
    );
    const row = res.rows?.[0];
    if (!row) return null;
    return BotGuildRowSchema.parse(row);
}

export async function createBotGuild(params: CreateBotGuild): Promise<QueryResult> {
    const valid = CreateBotGuildSchema.parse(params);
    return query(
        `
            insert into bot_guilds (guild_id, name, owner_user_id, joined_at, last_seen_at)
            values ($1, $2, $3, $4, $5)
        `,
        [
            valid.guild_id,
            valid.name,
            valid.owner_user_id ?? null,
            valid.joined_at ?? null,
            valid.last_seen_at ?? null,
        ]
    );
}

export async function setGuildOwnerIfUnclaimed(guildId: string, userId: string): Promise<boolean> {
    try {
        const res = await query(
            `
                update bot_guilds
                set owner_user_id = $1
                where guild_id = $2
            and owner_user_id is null
        `,
            [userId, guildId]
        );
        return (res.rowCount ?? 0) > 0;
    } catch {
        return false;
    }
}
