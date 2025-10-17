import { getChannelsByGuildId } from "@/lib/db/queries/channels";
import { ScansPanel } from "@/features/dashboard/scans";

type PageProps = {
    params: Promise<{ guildId: string }>;
};

export default async function ScansPage({ params }: PageProps) {
    const { guildId } = await params;

    // Fetch channels for the scans panel
    const channels = await getChannelsByGuildId(guildId);

    return <ScansPanel guildId={guildId} channels={channels} />;
}
