import { ColumnType, Selectable, Insertable, Updateable } from "kysely";

export interface FavoriteClipTable {
	id: ColumnType<number, number | undefined, never>;
	user_id: string;
	clip_id: string;
	created_at: ColumnType<Date, Date | undefined, Date | undefined>;
	updated_at: ColumnType<Date, Date | undefined, Date | undefined>;
}

export type FavoriteClip = Selectable<FavoriteClipTable>;
export type NewFavoriteClip = Insertable<FavoriteClipTable>;
export type FavoriteClipUpdate = Updateable<FavoriteClipTable>;
