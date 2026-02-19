import type { ColumnType, Selectable, Insertable, Updateable } from "kysely";

export interface ServerTagTable {
	id: ColumnType<string, string | undefined, never>;
	guild_id: string;
	name: string;
	slug: string;
	color: ColumnType<
		string | null,
		string | null | undefined,
		string | null | undefined
	>;
	created_by_user_id: string;
	created_at: ColumnType<Date, Date | undefined, Date | undefined>;
	is_active: ColumnType<boolean, boolean | undefined, boolean | undefined>;
}

export type ServerTag = Selectable<ServerTagTable>;
export type NewServerTag = Insertable<ServerTagTable>;
export type ServerTagUpdate = Updateable<ServerTagTable>;
