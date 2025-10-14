import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

export interface InstallIntentsTable {
  id: Generated<number>;
  user_id: string;
  guild_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  state: string;
  expires_at: Date;
  created_at: ColumnType<Date, Date | undefined, Date | undefined>;
}

export type InstallIntent = Selectable<InstallIntentsTable>;
export type NewInstallIntent = Insertable<InstallIntentsTable>;
export type InstallIntentUpdate = Updateable<InstallIntentsTable>;

// Partial of install intent, requiring ids and state to correctly remove intents
export type InstallIntentPartial = {
  user_id?: string; // TODO: make required
  guild_id?: string; // TODO: make required
  state: string;
} & Partial<InstallIntentUpdate>;