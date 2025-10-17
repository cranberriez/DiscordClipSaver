import DynamicSettingsForm from "@/components/guild/DynamicSettingsForm";
import { DangerZone } from "@/components/guild/DangerZone";
import { getSingleGuildById } from "@/lib/db/queries/guilds";
import { redirect } from "next/navigation";

type PageProps = {
    params: Promise<{ guildId: string }>;
};

export default async function SettingsPage({ params }: PageProps) {
    const { guildId } = await params;
    
    // Fetch guild data for danger zone
    const guild = await getSingleGuildById(guildId);
    
    if (!guild) {
        redirect("/dashboard");
    }

    // Note: Channels are now fetched client-side using TanStack Query
    // This allows the data to be reused across multiple components

    return (
        <div className="space-y-8">
            <DynamicSettingsForm guildId={guildId} />
            
            {/* Only show danger zone if guild is not already deleted */}
            {!guild.deleted_at && (
                <DangerZone 
                    guildId={guildId} 
                    guildName={guild.name}
                />
            )}
        </div>
    );
}
