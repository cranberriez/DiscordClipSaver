import type { ColumnType, Selectable } from "kysely";

export interface ThumbnailTable {
	id: string;
	clip_id: string;
	size_type: string; // 'small' or 'large'
	storage_path: string;
	width: number;
	height: number;
	file_size: ColumnType<bigint, bigint | number, bigint | number>;
	mime_type: ColumnType<string, string | undefined, string | undefined>;
	created_at: ColumnType<Date, Date | undefined, Date | undefined>;
	updated_at: ColumnType<Date, Date | undefined, Date | undefined>;
	deleted_at: ColumnType<
		Date | null,
		Date | null | undefined,
		Date | null | undefined
	>;
}

export type Thumbnail = Selectable<ThumbnailTable>;
