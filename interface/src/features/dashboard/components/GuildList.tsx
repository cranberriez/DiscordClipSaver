// interface/src/app/dashboard/GuildList.tsx
"use client";

import { useSession } from "next-auth/react";
import { useGuilds } from "@/lib/hooks";
import { canInviteBotPerms } from "@/lib/discord/visibility";
import type { GuildRelation } from "@/server/discord/types";
import { GuildItemComponent } from "./GuildItemComponent";
import type { GuildResponse } from "@/lib/api/guild";

export default function GuildList() {
    const { data: session } = useSession();

    if (!session?.user?.id) {
        return (
            <p className="text-sm text-red-500">
                You must sign in to view guilds.
            </p>
        );
    }

    const { isLoading, error, data: guilds } = useGuilds(true);

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
    const installedNoOwner: GuildResponse[] = guilds.filter(
        i => i.owner_id == null
    );
    const installedOwnedByYou: GuildResponse[] = guilds.filter(
        i => i.owner_id === currentUserId
    );
    const installedOthers: GuildResponse[] = guilds.filter(
        i => i.owner_id != null && i.owner_id !== currentUserId
    );
    const invitable: GuildResponse[] = guilds.filter(
        i => !i.owner_id && canInviteBotPerms(BigInt(i.permissions))
    );
    const notInstalled: GuildResponse[] = guilds.filter(
        i => !i.owner_id && !canInviteBotPerms(BigInt(i.permissions))
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
    items: GuildResponse[];
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
