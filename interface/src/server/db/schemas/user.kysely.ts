import type { ColumnType, Insertable, Selectable, Updateable } from "kysely";

export interface UserTable {
	id: string;
	username: string;
	discriminator: string;
	avatar_url: ColumnType<
		string | null,
		string | null | undefined,
		string | null | undefined
	>;
	roles: ColumnType<string, string | undefined, string | undefined>;
	created_at: ColumnType<Date, Date | undefined, Date | undefined>;
	updated_at: ColumnType<Date, Date | undefined, Date | undefined>;
}

export type User = Selectable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type UserUpdate = Updateable<UserTable>;
