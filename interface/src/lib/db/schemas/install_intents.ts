import { z } from "zod";

export const InstallIntentRowSchema = z.object({
  state: z.string(),
  user_id: z.string(),
  guild_id: z.string(),
  created_at: z.coerce.date(),
  expires_at: z.coerce.date(),
});
export type InstallIntentRow = z.infer<typeof InstallIntentRowSchema>;

export const CreateInstallIntentSchema = z.object({
  state: z.string(),
  userId: z.string(),
  guildId: z.string(),
  expiresAt: z.coerce.date(),
});
export type CreateInstallIntent = z.infer<typeof CreateInstallIntentSchema>;
