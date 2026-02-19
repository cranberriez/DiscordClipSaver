"use client";

import { useSession } from "next-auth/react";
import { useGuildsDiscord } from "@/lib/hooks";
import type { GuildRelation } from "@/server/discord/types";
import { GuildItemComponent } from "./GuildItemComponent";
import type { EnrichedDiscordGuild } from "@/lib/api/guild";
import { categorizeGuilds } from "../lib";
import { YourServers } from "./YourServers";
import { ItemGrid } from "@/components/layout";

export function GuildList() {
	const { data: session } = useSession();
	const { isLoading, error, data: guilds } = useGuildsDiscord(true);

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

	if (!session?.user?.id) {
		return (
			<p className="text-sm text-red-500">
				You must sign in to view guilds.
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
		<div className="flex flex-col gap-12">
			{/* <Section
                title="Installed (owned by you)"
                relation="owned"
                items={categorizedGuilds.installedOwnedByYou}
            /> */}

			<YourServers guilds={categorizedGuilds.installedOwnedByYou} />

			{/* <Section
                title="Installed (no owner yet)"
                relation="unowned"
                items={categorizedGuilds.installedNoOwner}
            /> */}

			<Section
				title="Ready To Add"
				subtext="Servers where you can invite the bot"
				relation="invitable"
				items={categorizedGuilds.invitable}
			/>
			<Section
				title="Installed By Others"
				subtext="Servers you can view but are owned by others"
				relation="other"
				items={categorizedGuilds.installedOthers}
			/>
		</div>
	);
}

function Section({
	title,
	subtext,
	items,
	relation,
}: {
	title: string;
	subtext: string;
	items: EnrichedDiscordGuild[];
	relation: GuildRelation;
}) {
	if (items.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h2 className="text-xl font-bold">{title}</h2>
				<p className="text-muted-foreground">{subtext}</p>
			</div>
			<ItemGrid>
				{items.map((guild) => (
					<GuildItemComponent
						guild={guild}
						relation={relation}
						key={guild.id}
					/>
				))}
			</ItemGrid>
		</div>
	);
}
