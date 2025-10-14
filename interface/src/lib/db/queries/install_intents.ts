import { getDb } from "../db";
import type {
    InstallIntent,
    NewInstallIntent,
    InstallIntentPartial,
} from "../types";

export async function consumeInstallIntent(
    params: InstallIntentPartial
): Promise<InstallIntent | null> {
    const intent = await getDb()
        .deleteFrom("install_intent")
        .where("state", "=", params.state)
        // .where("guild_id", "=", params.guild_id)
        // .where("user_id", "=", params.user_id)
        .where("expires_at", ">", new Date())
        .returningAll()
        .executeTakeFirst();

    if (!intent) return null;
    return intent satisfies InstallIntent;
}

export async function createInstallIntent(
    params: NewInstallIntent
): Promise<Date> {
    const newIntent = await getDb()
        .insertInto("install_intent")
        .values({
            state: params.state,
            user_id: params.user_id,
            guild_id: params.guild_id,
            expires_at: params.expires_at,
        })
        .returning("expires_at")
        .executeTakeFirstOrThrow();

    if (!newIntent) throw new Error("Failed to create install intent");
    return newIntent.expires_at;
}
