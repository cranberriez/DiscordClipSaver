// interface/src/app/dashboard/GuildList.tsx
"use client";

import { useSession } from "next-auth/react";
import { useGuilds } from "@/lib/hooks";
import { canInviteBot } from "@/lib/discord/visibility";
import type { FullGuild, GuildRelation } from "@/lib/discord/types";
import { GuildItemComponent } from "./GuildItemComponent";

export default function GuildList() {
    const { data: session } = useSession();
    const { data, isLoading, error } = useGuilds();

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

    if (error) {
        return (
            <p className="text-sm text-red-500">
                Failed to load guilds: {error.message}
            </p>
        );
    }

    const currentUserId = String(session.user.id);
    const discordGuilds = data?.guilds ?? [];
    const dbGuilds = data?.dbGuilds ?? [];

    if (discordGuilds.length === 0) {
        return <p className="text-sm text-red-500">No guilds found.</p>;
    }

    // Build FullGuild[] by joining Discord partial guilds with optional DB rows
    const dbById = new Map(dbGuilds.map(row => [row.id, row]));
    const items: FullGuild[] = discordGuilds.filter(Boolean).map(dg => ({
        discord: dg,
        db: dg?.id ? dbById.get(dg.id) : undefined,
    }));

    // Categorize
    const installed: FullGuild[] = items.filter(i => i.db);
    const installedNoOwner: FullGuild[] = installed.filter(
        i => i.db?.owner_id == null
    );
    const installedOwnedByYou: FullGuild[] = installed.filter(
        i => i.db?.owner_id === currentUserId
    );
    const installedOthers: FullGuild[] = installed.filter(
        i => i.db?.owner_id != null && i.db.owner_id !== currentUserId
    );
    const invitable: FullGuild[] = items.filter(
        i => !i.db && canInviteBot(i.discord)
    );
    const notInstalled: FullGuild[] = items.filter(
        i => !i.db && !canInviteBot(i.discord)
    );

    return (
        <div className="space-y-6">
            <Section
                title="Installed (owned by you)"
                relation="owned"
                items={installedOwnedByYou}
            />
            <Section
                title="Installed (no owner yet)"
                relation="unowned"
                items={installedNoOwner}
            />
            <Section
                title="Invitable (you can add the bot)"
                relation="invitable"
                items={invitable}
            />
            <Section
                title="Installed (owned by others)"
                relation="other"
                items={installedOthers}
            />
            <Section
                title="Not installed"
                relation="other"
                items={notInstalled}
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
    items: FullGuild[];
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
                        key={guild.discord.id}
                    />
                ))}
            </ul>
        </div>
    );
}
