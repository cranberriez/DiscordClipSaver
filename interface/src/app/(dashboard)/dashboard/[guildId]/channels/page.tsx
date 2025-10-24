import { ChannelsList } from "@/features/dashboard/admin/channels";

type PageProps = {
    params: Promise<{ guildId: string }>;
};

export default async function ChannelsPage({ params }: PageProps) {
    const { guildId } = await params;

    return <ChannelsList guildId={guildId} />;
}
