import { Server } from "lucide-react";

export function ServerIcon({
	guildIcon,
	guildName,
}: {
	guildIcon: string | null;
	guildName: string;
}) {
	return (
		<div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
			{guildIcon ? (
				<img
					src={guildIcon}
					alt={guildName || "Guild Icon"}
					className="h-full w-full object-cover"
				/>
			) : (
				<div className="bg-muted flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg">
					<Server className="text-muted-foreground h-8 w-8" />
				</div>
			)}
		</div>
	);
}
