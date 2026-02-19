import type { ColumnType, Selectable, Insertable, Updateable } from "kysely";

export interface ClipTagTable {
	id: ColumnType<number, number | undefined, never>;
	guild_id: string;
	clip_id: string;
	tag_id: string;
	applied_by_user_id: string;
	applied_at: ColumnType<Date, Date | undefined, Date | undefined>;
}

export type ClipTag = Selectable<ClipTagTable>;
export type NewClipTag = Insertable<ClipTagTable>;
export type ClipTagUpdate = Updateable<ClipTagTable>;
