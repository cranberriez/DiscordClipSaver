import DynamicSettingsForm from "@/components/guild/DynamicSettingsForm";

type PageProps = {
    params: Promise<{ guildId: string }>;
};

export default async function SettingsPage({ params }: PageProps) {
    const { guildId } = await params;

    return <DynamicSettingsForm guildId={guildId} />;
}
