import { getSingleGuildById } from "@/lib/db/queries/guilds";
import { getChannelsByGuildId } from "@/lib/db/queries/channels";

type PageProps = {
    params: Promise<{ guildId: string }>;
};

export default async function DebugPage({ params }: PageProps) {
    const { guildId } = await params;

    // Fetch all data for debugging
    const [guild, channels] = await Promise.all([
        getSingleGuildById(guildId),
        getChannelsByGuildId(guildId),
    ]);

    return (
        <div className="space-y-6">
            <div className="p-4 bg-white/5 rounded-lg">
                <h2 className="text-xl font-semibold mb-2">Guild Data</h2>
                <pre className="text-xs overflow-auto">
                    {JSON.stringify(guild, null, 2)}
                </pre>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
                <h2 className="text-xl font-semibold mb-2">
                    Channels ({channels.length})
                </h2>
                <pre className="text-xs overflow-auto">
                    {JSON.stringify(channels, null, 2)}
                </pre>
            </div>
        </div>
    );
}
