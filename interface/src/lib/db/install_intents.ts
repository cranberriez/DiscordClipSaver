import { query } from "./index";
import { InstallIntent } from "../types";
import { InstallIntentRowSchema, CreateInstallIntentSchema, type CreateInstallIntent } from "./schemas/install_intents";

export async function consumeInstallIntent(state: string): Promise<InstallIntent | null> {
	const res = await query(
		`
            delete from install_intents
            where state = $1
            returning state, user_id, guild_id, created_at, expires_at
        `,
		[state]
	);
	const row = res.rows?.[0];
	if (!row) return null;
	const parsed = InstallIntentRowSchema.parse(row);
	return {
		state: parsed.state,
		user_id: parsed.user_id,
		guild_id: parsed.guild_id,
		created_at: parsed.created_at.toISOString(),
		expires_at: parsed.expires_at.toISOString(),
	} satisfies InstallIntent;
}

export async function createInstallIntent(params: CreateInstallIntent): Promise<InstallIntent> {
	const valid = CreateInstallIntentSchema.parse(params);
	const res = await query(
		`
            insert into install_intents (state, user_id, guild_id, created_at, expires_at)
            values ($1, $2, $3, now(), $4)
            returning state, user_id, guild_id, created_at, expires_at
        `,
		[valid.state, valid.userId, valid.guildId, valid.expiresAt]
	);
	const parsed = InstallIntentRowSchema.parse(res.rows[0]);
	return {
		state: parsed.state,
		user_id: parsed.user_id,
		guild_id: parsed.guild_id,
		created_at: parsed.created_at.toISOString(),
		expires_at: parsed.expires_at.toISOString(),
	} satisfies InstallIntent;
}
