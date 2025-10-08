// interface/src/app/dashboard/GuildList.tsx
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { canInviteBot } from "@/lib/discord";
import type { Guild, DBGuild, GuildItem, GuildRelation } from "@/lib/types";
import { GuildItemComponent } from "./GuildItemComponent";

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export default async function GuildList() {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return <p className="text-sm text-red-500">You must sign in to view guilds.</p>;
	}
	const currentUserId = String(session.user.id);

	const res = await fetch(`${baseUrl}/api/discord/user/guilds?includeDb=1`, {
		headers: { Cookie: (await cookies()).toString() },
		cache: "no-store",
	});

	if (!res.ok) {
		const message = res.status === 401 ? "You must sign in to view guilds." : "Failed to load guilds.";
		return <p className="text-sm text-red-500">{message}</p>;
	}

	const { guilds, botGuilds } = (await res.json()) as {
		guilds: Guild[];
		botGuilds: DBGuild[];
	};

	// Build unified items (GuildItem[]) by merging Discord guilds with optional DB info
	const installedById = new Map(botGuilds.map((g) => [g.guild_id, g]));
	const items: GuildItem[] = guilds.map((g) => ({ ...g, db: installedById.get(g.id) ?? undefined }));
	// Categories derived from unified items
	const invitable: GuildItem[] = items.filter((i) => !i.db && canInviteBot(i));
	const installedNoOwner: GuildItem[] = items.filter((i) => i.db && i.db.owner_user_id == null);
	const installedOwnedByYou: GuildItem[] = items.filter((i) => i.db?.owner_user_id === currentUserId);
	const installedOthers: GuildItem[] = items.filter(
		(i) => i.db && i.db.owner_user_id != null && i.db.owner_user_id !== currentUserId
	);
	const notInstalled: GuildItem[] = items.filter((i) => !i.db);

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

function Section({ title, items, relation }: { title: string; items: GuildItem[]; relation: GuildRelation }) {
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
				{items.map((guild) => (
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
