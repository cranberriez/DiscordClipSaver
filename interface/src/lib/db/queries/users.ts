import { getDb } from "../db";
import type { User, NewUser, UserUpdate } from "../types";

export async function upsertUser(params: NewUser): Promise<User> {
    if (!params.id) throw new Error("User ID is required");
    if (!params.username) throw new Error("Username is required");
    if (!params.discriminator) throw new Error("Discriminator is required");

    const newUser: NewUser = {
        id: params.id,
        username: params.username,
        discriminator: params.discriminator,
        avatar_url: params.avatar_url ?? null,
    };

    return getDb()
        .insertInto("user")
        .values(newUser)
        .returningAll()
        .executeTakeFirstOrThrow(); // it SHOULD return the inserted row, throwing is good :)
}

export async function updateUser(params: UserUpdate): Promise<User> {
    if (!params.id) throw new Error("User ID is required");

    return getDb()
        .updateTable("user")
        .set(params)
        .where("id", "=", params.id)
        .returningAll()
        .executeTakeFirstOrThrow();
}

export async function getUserByDiscordId(
    discordUserId: string
): Promise<User | null> {
    const row = await getDb()
        .selectFrom("user")
        .selectAll()
        .where("id", "=", discordUserId)
        .executeTakeFirst();

    if (!row) return null;
    return row;
}
