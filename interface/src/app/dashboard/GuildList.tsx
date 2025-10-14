// interface/src/app/dashboard/GuildList.tsx
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { canInviteBot } from "@/lib/discord";
import type { GuildRelation } from "@/lib/types";
import type { Guild } from "@/lib/db/types";
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

	const guilds = (await res.json()) as Guild[];

	// Build unified items (GuildItem[]) by merging Discord guilds with optional DB info
	const installedById = new Map(guilds.map((g) => [g.id, g]));
	const items: Guild[] = guilds.map((g) => ({ ...g, db: installedById.get(g.id) ?? undefined }));
	// Categories derived from unified items
	const invitable: Guild[] = items.filter((i) => !i && canInviteBot(i));
	const installedNoOwner: Guild[] = items.filter((i) => i && i.owner_id == null);
	const installedOwnedByYou: Guild[] = items.filter((i) => i?.owner_id === currentUserId);
	const installedOthers: Guild[] = items.filter(
		(i) => i && i.owner_id != null && i.owner_id !== currentUserId
	);
	const notInstalled: Guild[] = items.filter((i) => !i);

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

function Section({ title, items, relation }: { title: string; items: Guild[]; relation: GuildRelation }) {
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
