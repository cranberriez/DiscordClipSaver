import type { EnrichedDiscordGuild } from "@/lib/api/guild";
import { canInviteBotPerms } from "@/lib/discord/visibility";

export interface CategorizedGuilds {
    installedOwnedByYou: EnrichedDiscordGuild[];
    installedNoOwner: EnrichedDiscordGuild[];
    invitable: EnrichedDiscordGuild[];
    installedOthers: EnrichedDiscordGuild[];
    notInstalled: EnrichedDiscordGuild[];
}

export function categorizeGuilds(
    guilds: EnrichedDiscordGuild[],
    userId: string
) {
    const installedOwnedByYou: EnrichedDiscordGuild[] = guilds.filter(
        i => i.db?.owner_id === userId
    );
    const installedNoOwner: EnrichedDiscordGuild[] = guilds.filter(
        i => i.db != null && i.db.owner_id == null
    );
    const invitable: EnrichedDiscordGuild[] = guilds.filter(
        i => !i.db && canInviteBotPerms(BigInt(i.permissions))
    );
    const installedOthers: EnrichedDiscordGuild[] = guilds.filter(
        i => i.db?.owner_id != null && i.db?.owner_id !== userId
    );
    const notInstalled: EnrichedDiscordGuild[] = guilds.filter(
        i => !i.db && !canInviteBotPerms(BigInt(i.permissions))
    );

    return {
        installedOwnedByYou,
        installedNoOwner,
        invitable,
        installedOthers,
        notInstalled,
    };
}
