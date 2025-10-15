import { getChannelsByGuildId } from "@/lib/db/queries/channels";
import { getSingleGuildById } from "@/lib/db/queries/guilds";
import ChannelsList from "@/components/guild/ChannelsList";

type PageProps = {
    params: Promise<{ guildId: string }>;
};

export default async function ChannelsPage({ params }: PageProps) {
    const { guildId } = await params;

    // Fetch channels and guild data
    const [channels, guild] = await Promise.all([
        getChannelsByGuildId(guildId),
        getSingleGuildById(guildId),
    ]);

    return (
        <ChannelsList
            channels={channels}
            guildId={guildId}
            guildScanEnabled={guild?.message_scan_enabled ?? false}
        />
    );
}
