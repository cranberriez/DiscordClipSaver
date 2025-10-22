/**
 * Kysely schema for author table
 */
import type { Generated, Insertable, Selectable, Updateable } from "kysely";

export interface AuthorTable {
    id: Generated<number>;
    user_id: string;
    guild_id: string;
    username: string;
    discriminator: string;
    avatar_url: string | null;
    nickname: string | null;
    display_name: string | null;
    guild_avatar_url: string | null;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type SelectableAuthor = Selectable<AuthorTable>;
export type NewAuthor = Insertable<AuthorTable>;
export type AuthorUpdate = Updateable<AuthorTable>;
