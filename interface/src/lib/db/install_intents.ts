import { InstallIntent } from "../types";
import { getPool } from "./index";

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
