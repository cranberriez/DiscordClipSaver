import { DataService } from "@/server/services/data-service";

type PageProps = {
	params: Promise<{ guildId: string }>;
};

export default async function DebugPage({ params }: PageProps) {
	const { guildId } = await params;

	// Fetch all data for debugging
	const guild = await DataService.getSingleGuildById(guildId);
	const channels = await DataService.getChannelsByGuildId(guildId);

	return (
		<div className="space-y-6">
			<div className="rounded-lg bg-white/5 p-4">
				<h2 className="mb-2 text-xl font-semibold">Guild Data</h2>
				<pre className="overflow-auto text-xs">
					{JSON.stringify(guild, null, 2)}
				</pre>
			</div>

			<div className="rounded-lg bg-white/5 p-4">
				<h2 className="mb-2 text-xl font-semibold">
					Channels ({channels?.length})
				</h2>
				<pre className="overflow-auto text-xs">
					{JSON.stringify(channels, null, 2)}
				</pre>
			</div>
		</div>
	);
}
