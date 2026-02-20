import { getDb } from "../db";
import type {
	DbInstallIntent,
	DbNewInstallIntent,
	DbInstallIntentPartial,
} from "../types";

export async function consumeInstallIntent(
	params: DbInstallIntentPartial
): Promise<DbInstallIntent | null> {
	const intent = await getDb()
		.deleteFrom("install_intent")
		.where("state", "=", params.state)
		// .where("guild_id", "=", params.guild_id)
		// .where("user_id", "=", params.user_id)
		.where("expires_at", ">", new Date())
		.returningAll()
		.executeTakeFirst();

	if (!intent) return null;
	return intent satisfies DbInstallIntent;
}

export async function createInstallIntent(
	params: DbNewInstallIntent
): Promise<Date> {
	const now = new Date();
	const newIntent = await getDb()
		.insertInto("install_intent")
		.values({
			state: params.state,
			user_id: params.user_id,
			guild: params.guild,
			expires_at: params.expires_at,
			created_at: now,
		})
		.returning("expires_at")
		.executeTakeFirstOrThrow();

	if (!newIntent) throw new Error("Failed to create install intent");
	return newIntent.expires_at;
}
