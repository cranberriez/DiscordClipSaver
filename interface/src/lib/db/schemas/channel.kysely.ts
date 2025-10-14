import type { ColumnType, Selectable } from "kysely";

export type ChannelType = "text" | "voice" | "category" | "forum";

export interface ChannelTable {
  id: string;
  guild_id: string;
  name: string;
  type: ColumnType<ChannelType, ChannelType | undefined, ChannelType | undefined>;
  position: ColumnType<number, number | undefined, number | undefined>;
  parent_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  topic: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  nsfw: ColumnType<boolean, boolean | undefined, boolean | undefined>;
  message_scan_enabled: ColumnType<boolean, boolean | undefined, boolean | undefined>;
  last_channel_sync_at: ColumnType<Date | null, Date | null | undefined, Date | null | undefined>;
  next_allowed_channel_sync_at: ColumnType<Date | null, Date | null | undefined, Date | null | undefined>;
  channel_sync_cooldown_level: ColumnType<number, number | undefined, number | undefined>;
  deleted_at: ColumnType<Date | null, Date | null | undefined, Date | null | undefined>;
  created_at: ColumnType<Date, Date | undefined, Date | undefined>;
  updated_at: ColumnType<Date, Date | undefined, Date | undefined>;
}

export type Channel = Selectable<ChannelTable>;
