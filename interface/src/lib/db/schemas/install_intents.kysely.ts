import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

export interface InstallIntentTable {
  id: Generated<number>;
  user: string;
  guild: string;
  state: string;
  expires_at: Date;
  created_at: ColumnType<Date, Date | undefined, Date | undefined>;
}

export type InstallIntent = Selectable<InstallIntentTable>;
export type NewInstallIntent = Insertable<InstallIntentTable>;
export type InstallIntentUpdate = Updateable<InstallIntentTable>;

// Partial of install intent, requiring ids and state to correctly remove intents
export type InstallIntentPartial = {
  user?: string; // TODO: make required
  guild?: string; // TODO: make required
  state: string;
} & Partial<InstallIntentUpdate>;