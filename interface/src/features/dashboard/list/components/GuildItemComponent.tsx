import type { EnrichedDiscordGuild } from "@/lib/api/guild";

import { DiscordIcon } from "./DiscordGuildIcon";
import { Item } from "@/components/ui/item";
import { Button } from "@/components/ui/button";
import { Plus, Eye } from "lucide-react";

export function GuildItemComponent({
	guild,
	relation,
}: {
	guild: EnrichedDiscordGuild;
	relation: string;
}) {
	const id = guild.id;
	const name = guild.name ?? "Unknown";
	const icon = guild.icon ?? null;

	// return (
	//     <li key={id} className="rounded border border-white/40 gap-4 p-3 flex">
	//         <div className="flex items-center gap-2">
	//             <DiscordIcon guildId={id} iconUrl={icon || ""} />
	//         </div>
	//         <div className="flex flex-col items-start">
	//             <p className="font-medium">{name}</p>
	//             <p className="text-xs text-muted-foreground">
	//                 ID: {id}
	//                 {owner ? ` (owner: ${owner})` : ""}
	//             </p>
	//         </div>
	//         <div className="flex flex-col ml-auto">
	//             <p className="text-xs text-muted-foreground">{relation}</p>
	//             <RelationButton guildId={id} relation={relation} />
	//         </div>
	//     </li>

	// );

	return (
		<Item variant="outline" className="bg-card/50 rounded-2xl p-2 pr-4">
			<DiscordIcon guildId={id} iconUrl={icon || ""} size="md" />

			<div className="flex flex-1 flex-col gap-1">
				<p className="text-base font-bold">{name}</p>
				<p className="text-muted-foreground text-sm">
					You can invite the bot to this server
				</p>
			</div>

			<RelationButton guildId={id} relation={relation} />
		</Item>
	);
}

function RelationButton({
	guildId,
	relation,
}: {
	guildId: string;
	relation: string;
}) {
	const relations = {
		owned: {
			text: "Edit",
			link: `/dashboard/${guildId}`,
			colorClass: "text-green-500",
		},
		invitable: {
			text: "Invite",
			link: `/api/discord/bot/invite?guildId=${guildId}`,
			colorClass: "text-blue-500",
		},
		unowned: { text: "Claim", link: "#", colorClass: "text-orange-400" },
		other: { text: "View", link: "#", colorClass: "text-blue-200" },
	};

	const rel = relations[relation as keyof typeof relations];

	// Use a normal anchor for API routes to force full browser navigation and avoid RSC fetch errors
	if (relation === "invitable") {
		return (
			<Button
				variant="default"
				aria-label="Edit"
				asChild
				className="gap-2"
			>
				<a href={rel.link} className="flex items-center gap-2">
					<Plus className="size-4" />
					<p className="mb-[2px]">Invite Bot</p>
				</a>
			</Button>
		);
	}

	return (
		<Button variant="outline" aria-label="Edit" asChild>
			<a href={rel.link} className="flex items-center gap-2">
				<Eye className="size-4" />
				<p className="mb-[2px]">{rel.text}</p>
			</a>
		</Button>
	);
}
