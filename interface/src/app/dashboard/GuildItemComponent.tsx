import type { GuildItem, GuildRelation } from "@/lib/types";
import Link from "next/link";

export function GuildItemComponent({ guild, relation }: { guild: GuildItem; relation: GuildRelation }) {
	const { id, name, db } = guild;

	return (
		<li
			key={id}
			className="rounded border border-white/40 gap-2 p-3 flex justify-between"
		>
			<div className="flex flex-col items-start">
				<p className="font-medium">{name}</p>
				<p className="text-xs text-muted-foreground">
					ID: {id}
					{db ? ` (owner: ${db.owner_user_id})` : ""}
				</p>
			</div>
			<div className="flex flex-col items-end">
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
