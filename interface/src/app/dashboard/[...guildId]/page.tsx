import { getAuthInfo } from "@/lib/auth";
import { getSingleGuildById } from "@/lib/db/queries/guilds";
import { getChannelsByGuildId } from "@/lib/db/queries/channels";
import { redirect } from "next/navigation";
import Link from "next/link";
import ChannelsList from "./ChannelsList";
import GuildTabs from "./GuildTabs";
import DynamicSettingsForm from "./DynamicSettingsForm";
import GuildHeader from "./GuildHeader";

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
                <Link
                    href="/dashboard"
                    className="text-blue-500 hover:underline mt-4 inline-block"
                >
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
                    This guild is not registered in the system or has been
                    deleted.
                </p>
                <Link
                    href="/dashboard"
                    className="text-blue-500 hover:underline mt-4 inline-block"
                >
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
                <p className="text-red-500">
                    You do not have permission to view this guild.
                </p>
                <Link
                    href="/dashboard"
                    className="text-blue-500 hover:underline mt-4 inline-block"
                >
                    ← Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl">
            <Link
                href="/dashboard"
                className="text-blue-500 hover:underline mb-4 inline-block"
            >
                ← Back to Dashboard
            </Link>

            <div className="mt-4 space-y-6">
                <GuildHeader
                    guildId={guild.id}
                    guildName={guild.name}
                    ownerId={guild.owner_id}
                    messageScanEnabled={guild.message_scan_enabled}
                    lastMessageScanAt={guild.last_message_scan_at}
                    createdAt={guild.created_at}
                    iconUrl={guild.icon_url}
                />

                <GuildTabs
                    tabs={[
                        {
                            id: "overview",
                            label: "Overview",
                            content: (
                                <ChannelsList
                                    channels={channels}
                                    guildId={guild.id}
                                    guildScanEnabled={guild.message_scan_enabled}
                                />
                            ),
                        },
                        {
                            id: "settings",
                            label: "Settings",
                            content: <DynamicSettingsForm guildId={guild.id} />,
                        },
                        {
                            id: "debug",
                            label: "Debug",
                            content: (
                                <div className="p-4 bg-white/5 rounded-lg">
                                    <h2 className="text-xl font-semibold mb-2">
                                        Raw Data
                                    </h2>
                                    <pre className="text-xs overflow-auto">
                                        {JSON.stringify(guild, null, 2)}
                                    </pre>
                                </div>
                            ),
                        },
                    ]}
                    defaultTab="overview"
                />
            </div>
        </div>
    );
}
