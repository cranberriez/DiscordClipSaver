import { getAuthInfo } from "@/server/auth";
import { DataService } from "@/server/services/data-service";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
    GuildHeader,
    GuildTabNav,
    DeletedGuildBanner,
} from "@/features/dashboard/";

type LayoutProps = {
    children: React.ReactNode;
    params: Promise<{ guildId: string }>;
};

export default async function GuildLayout({ children, params }: LayoutProps) {
    // Check authentication
    const authInfo = await getAuthInfo();
    if (!authInfo) {
        redirect("/dashboard");
    }

    // Get guild ID from params
    const { guildId } = await params;

    if (!guildId) {
        redirect("/dashboard");
    }

    // Fetch guild from database
    const guild = await DataService.getSingleGuildById(guildId);

    if (!guild) {
        return (
            <div className="container mx-auto p-8">
                <h1 className="text-2xl font-semibold mb-4">Guild Not Found</h1>
                <p className="text-gray-400 mb-4">
                    This guild is not registered in the system or has been
                    deleted.
                </p>
                <Link
                    href="/dashboard"
                    className="text-blue-500 hover:underline"
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
            <div className="container mx-auto p-8">
                <h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
                <p className="text-red-400 mb-4">
                    You do not have permission to view this guild.
                </p>
                <Link
                    href="/dashboard"
                    className="text-blue-500 hover:underline"
                >
                    ← Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-8 max-w-6xl">
            {/* Back Link */}
            <Link
                href="/dashboard"
                className="text-blue-500 hover:underline mb-6 inline-block"
            >
                ← Back to Dashboard
            </Link>

            {/* Deleted Guild Banner */}
            {guild.deleted_at && (
                <DeletedGuildBanner
                    guildId={guild.id}
                    guildName={guild.name}
                    deletedAt={guild.deleted_at}
                />
            )}

            {/* Guild Header */}
            <GuildHeader guild={guild} />

            {/* Tab Navigation */}
            <GuildTabNav guildId={guild.id} />

            {/* Tab Content */}
            <div className="mt-6">{children}</div>
        </div>
    );
}
