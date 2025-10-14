import type { FullGuild, GuildRelation } from "@/lib/discord/types";
import Link from "next/link";
import DebugButton from "./debugButton";

export function GuildItemComponent({ guild, relation }: { guild: FullGuild; relation: GuildRelation }) {
	const id = guild.discord.id;
	const name = guild.discord.name ?? guild.db?.name ?? "Unknown";
	const owner = guild.db?.owner ?? null;
	const icon = guild.discord.icon ?? null;

	return (
		<li
			key={id}
			className="rounded border border-white/40 gap-4 p-3 flex"
		>
			<div className="flex items-center gap-2">
				<DiscordIcon
					guildId={id}
					iconUrl={icon || ""}
				/>
			</div>
			<div className="flex flex-col items-start">
				<p className="font-medium">{name}</p>
				<p className="text-xs text-muted-foreground">
					ID: {id}
					{owner ? ` (owner: ${owner})` : ""}
				</p>
				<DebugButton guild={guild} />
			</div>
			<div className="flex flex-col ml-auto">
				<p className="text-xs text-muted-foreground">{relation}</p>
				<RelationButton
					guildId={id}
					relation={relation}
				/>
			</div>
			
		</li>
	);
}

function RelationButton({ guildId, relation }: { guildId: string; relation: GuildRelation }) {
	const relations = {
		owned: { text: "Edit", link: "#", colorClass: "text-green-500" },
		invitable: { text: "Invite", link: `/api/discord/bot/invite?guildId=${guildId}`, colorClass: "text-blue-500" },
		unowned: { text: "Claim", link: "#", colorClass: "text-orange-400" },
		other: { text: "View", link: "#", colorClass: "text-blue-200" },
	};

	const rel = relations[relation];

	// Use a normal anchor for API routes to force full browser navigation and avoid RSC fetch errors
	if (relation === "invitable") {
		return (
			<a href={rel.link}>
				<button className={`hover:underline underline-offset-3 text-xs cursor-pointer ${rel.colorClass}`}>
					{rel.text}
				</button>
			</a>
		);
	}

	return (
		<Link href={rel.link}>
			<button className={`hover:underline underline-offset-3 text-xs cursor-pointer ${rel.colorClass}`}>
				{rel.text}
			</button>
		</Link>
	);
}

function DiscordIcon({ guildId, iconUrl }: { guildId: string; iconUrl: string }) {
	const realUrl = iconUrl ? `https://cdn.discordapp.com/icons/${guildId}/${iconUrl}.png?size=64` : "https://cdn.discordapp.com/embed/avatars/0.png?size=64";

	return (
		<div className="w-16 h-16 rounded-xl overflow-hidden">
			<img src={realUrl} />
		</div>
	);
}
