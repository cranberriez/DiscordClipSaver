import { Guild } from "@/lib/api/guild";

export function SimpleGuildInfo({ guild }: { guild: Guild }) {
	if (!guild) {
		return null;
	}

	return (
		<div className="flex items-center gap-2">
			<div>
				<img
					src={guild.icon_url ?? ""}
					alt={`${guild.name} icon`}
					className="h-16 w-16 rounded-xl"
				/>
			</div>
			<p className="text-lg font-semibold">{guild.name}</p>
		</div>
	);
}
