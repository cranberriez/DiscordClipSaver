import type { ColumnType, Insertable, Selectable, Updateable } from "kysely";

export interface UsersTable {
  id: string;
  username: string;
  discriminator: string;
  avatar_url: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<Date, Date | undefined, Date | undefined>;
  updated_at: ColumnType<Date, Date | undefined, Date | undefined>;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;
