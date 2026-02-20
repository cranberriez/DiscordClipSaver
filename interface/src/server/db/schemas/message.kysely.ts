import type { ColumnType, Selectable } from "kysely";

export interface MessageTable {
	id: string;
	guild_id: string;
	channel_id: string;
	author_id: string;
	content: ColumnType<
		string | null,
		string | null | undefined,
		string | null | undefined
	>;
	timestamp: Date;
	deleted_at: ColumnType<
		Date | null,
		Date | null | undefined,
		Date | null | undefined
	>;
	created_at: ColumnType<Date, Date | undefined, Date | undefined>;
	updated_at: ColumnType<Date, Date | undefined, Date | undefined>;
}

export type Message = Selectable<MessageTable>;
