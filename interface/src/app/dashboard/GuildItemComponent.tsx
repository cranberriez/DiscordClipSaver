import type { GuildItem, GuildRelation } from "@/lib/types";
import Link from "next/link";

export function GuildItemComponent({ guild, relation }: { guild: GuildItem; relation: GuildRelation }) {
	const { id, name, db } = guild;

	return (
		<li
			key={id}
			className="w-md rounded border border-white/40 p-3 flex justify-between"
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
				<RelationButton relation={relation} />
			</div>
		</li>
	);
}

function RelationButton({ relation }: { relation: GuildRelation }) {
	if (relation === "other") return null;

	const relations = {
		owned: { text: "Edit", link: "#", colorClass: "text-green-500" },
		invitable: { text: "Add Bot", link: "#", colorClass: "text-blue-500" },
		unowned: { text: "View", link: "#", colorClass: "text-orange-400" },
	};

	return (
		<Link href={relations[relation].link}>
			<button
				className={`hover:underline underline-offset-3 text-xs cursor-pointer ${relations[relation].colorClass}`}
			>
				{relations[relation].text}
			</button>
		</Link>
	);
}
