"use client";

import { useSession } from "next-auth/react";
import { useGuildsDiscord } from "@/lib/hooks";
import type { GuildRelation } from "@/server/discord/types";
import { GuildItemComponent } from "./GuildItemComponent";
import type { EnrichedDiscordGuild } from "@/lib/api/guild";
import { categorizeGuilds } from "../lib";

export function GuildList() {
    const { data: session } = useSession();
    const { isLoading, error, data: guilds } = useGuildsDiscord(true);

    if (!session?.user?.id) {
        return (
            <p className="text-sm text-red-500">
                You must sign in to view guilds.
            </p>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-gray-400">Loading guilds...</div>
            </div>
        );
    }

    if (error || !guilds) {
        return (
            <p className="text-sm text-red-500">
                Failed to load guilds: {error?.message}
            </p>
        );
    }

    const currentUserId = String(session.user.id);

    if (guilds.length === 0) {
        return <p className="text-sm text-red-500">No guilds found.</p>;
    }

    // Categorize
    const categorizedGuilds = categorizeGuilds(guilds, currentUserId);

    return (
        <div className="space-y-6">
            <Section
                title="Installed (owned by you)"
                relation="owned"
                items={categorizedGuilds.installedOwnedByYou}
            />
            <Section
                title="Installed (no owner yet)"
                relation="unowned"
                items={categorizedGuilds.installedNoOwner}
            />
            <Section
                title="Invitable (you can add the bot)"
                relation="invitable"
                items={categorizedGuilds.invitable}
            />
            <Section
                title="Installed (owned by others)"
                relation="other"
                items={categorizedGuilds.installedOthers}
            />
            <Section
                title="Not installed"
                relation="other"
                items={categorizedGuilds.notInstalled}
            />
        </div>
    );
}

function Section({
    title,
    items,
    relation,
}: {
    title: string;
    items: EnrichedDiscordGuild[];
    relation: GuildRelation;
}) {
    if (items.length === 0) {
        return (
            <div>
                <h3 className="mb-2 text-sm font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">None</p>
            </div>
        );
    }

    return (
        <div>
            <h3 className="mb-2 text-sm font-semibold">{title}</h3>
            <ul className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-fit">
                {items.map(guild => (
                    <GuildItemComponent
                        guild={guild}
                        relation={relation}
                        key={guild.id}
                    />
                ))}
            </ul>
        </div>
    );
}
