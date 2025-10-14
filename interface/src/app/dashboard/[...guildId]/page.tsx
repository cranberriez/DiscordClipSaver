import { getAuthInfo } from "@/lib/auth";
import { getSingleGuildById } from "@/lib/db/queries/guilds";
import { getChannelsByGuildId } from "@/lib/db/queries/channels";
import { redirect } from "next/navigation";
import Link from "next/link";
import ChannelsList from "./ChannelsList";

type PageProps = {
	params: Promise<{ guildId: string[] }>;
};

export default async function GuildPage({ params }: PageProps) {
	// Check authentication
	const authInfo = await getAuthInfo();
	if (!authInfo) {
		redirect("/dashboard");
	}

	// Extract guildId from catch-all route params
	const resolvedParams = await params;
	const guildId = resolvedParams.guildId[0];

	if (!guildId) {
		return (
			<div className="p-8">
				<h1 className="text-2xl font-semibold mb-4">Invalid Guild</h1>
				<p className="text-red-500">No guild ID provided.</p>
				<Link href="/dashboard" className="text-blue-500 hover:underline mt-4 inline-block">
					← Back to Dashboard
				</Link>
			</div>
		);
	}

	// Fetch guild data from database
	const guild = await getSingleGuildById(guildId);
	const channels = await getChannelsByGuildId(guildId);

	if (!guild) {
		return (
			<div className="p-8">
				<h1 className="text-2xl font-semibold mb-4">Guild Not Found</h1>
				<p className="text-muted-foreground">
					This guild is not registered in the system or has been deleted.
				</p>
				<Link href="/dashboard" className="text-blue-500 hover:underline mt-4 inline-block">
					← Back to Dashboard
				</Link>
			</div>
		);
	}

	// Check if user owns this guild
	const isOwner = guild.owner_id === authInfo.discordUserId;

	if (!isOwner) {
		return (
			<div className="p-8">
				<h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
				<p className="text-red-500">You do not have permission to view this guild.</p>
				<Link href="/dashboard" className="text-blue-500 hover:underline mt-4 inline-block">
					← Back to Dashboard
				</Link>
			</div>
		);
	}

	return (
		<div className="p-8 max-w-4xl">
			<Link href="/dashboard" className="text-blue-500 hover:underline mb-4 inline-block">
				← Back to Dashboard
			</Link>
			
			<div className="mt-4 space-y-6">
				<div>
					<h1 className="text-3xl font-bold mb-2">{guild.name}</h1>
					<p className="text-sm text-muted-foreground">Guild ID: {guild.id}</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<InfoCard title="Owner" value={guild.owner_id ?? "Unclaimed"} />
					<InfoCard 
						title="Message Scanning" 
						value={guild.message_scan_enabled ? "Enabled" : "Disabled"}
						valueClass={guild.message_scan_enabled ? "text-green-500" : "text-gray-500"}
					/>
					<InfoCard 
						title="Last Message Scan" 
						value={guild.last_message_scan_at ? new Date(guild.last_message_scan_at).toLocaleString() : "Never"} 
					/>
					<InfoCard 
						title="Created At" 
						value={new Date(guild.created_at).toLocaleString()} 
					/>
				</div>

				{guild.icon_url && (
					<div className="mt-6">
						<h2 className="text-xl font-semibold mb-2">Guild Icon</h2>
						<img 
							src={guild.icon_url} 
							alt={`${guild.name} icon`}
							className="w-32 h-32 rounded-xl"
						/>
					</div>
				)}

				<ChannelsList channels={channels} />

				<div className="mt-6 p-4 bg-white/5 rounded-lg">
					<h2 className="text-xl font-semibold mb-2">Raw Data</h2>
					<pre className="text-xs overflow-auto">
						{JSON.stringify(guild, null, 2)}
					</pre>
				</div>
			</div>
		</div>
	);
}

function InfoCard({ 
	title, 
	value, 
	valueClass = "text-white" 
}: { 
	title: string; 
	value: string; 
	valueClass?: string;
}) {
	return (
		<div className="p-4 border border-white/20 rounded-lg">
			<h3 className="text-sm text-muted-foreground mb-1">{title}</h3>
			<p className={`text-lg font-medium ${valueClass}`}>{value}</p>
		</div>
	);
}