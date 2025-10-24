import { DataService } from "@/server/services/data-service";
import { ScansPanel } from "@/features/dashboard/admin/scans";

type PageProps = {
    params: Promise<{ guildId: string }>;
};

export default async function ScansPage({ params }: PageProps) {
    const { guildId } = await params;

    // Fetch channels for the scans panel
    const channels = await DataService.getChannelsByGuildId(guildId);

    return <ScansPanel guildId={guildId} channels={channels || []} />;
}
