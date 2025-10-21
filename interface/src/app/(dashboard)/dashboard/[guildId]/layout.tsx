import { getAuthInfo } from "@/server/auth";
import { DataService } from "@/server/services/data-service";
import { redirect } from "next/navigation";
import {
    GuildHeader,
    GuildTabNav,
    DeletedGuildBanner,
} from "@/features/dashboard/";
import { PageContainer } from "@/components/layout";
import { BackButton } from "@/components/ui/back-button";

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
            <PageContainer>
                <h1 className="text-2xl font-semibold mb-4">Guild Not Found</h1>
                <p className="text-gray-400 mb-4">
                    This guild is not registered in the system or has been
                    deleted.
                </p>
                <BackButton text="Back to Dashboard" url="/dashboard" />
            </PageContainer>
        );
    }

    // Check if user owns this guild
    const isOwner = guild.owner_id === authInfo.discordUserId;

    if (!isOwner) {
        return (
            <PageContainer>
                <h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
                <p className="text-red-400 mb-4">
                    You do not have permission to view this guild.
                </p>
                <BackButton text="Back to Dashboard" url="/dashboard" />
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            {/* Back Link */}
            <BackButton text="Back to Dashboard" url="/dashboard" className="mb-6" />

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
        </PageContainer>
    );
}
