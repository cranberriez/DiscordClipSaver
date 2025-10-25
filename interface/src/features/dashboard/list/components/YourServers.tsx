import { DiscordGuild } from "@/server/discord/types";
import { ItemGrid } from "@/components/layout";
import { GuildEditItem } from "./GuildEditItem";
import { useGuildStats } from "@/lib/hooks";

export function YourServers({ guilds }: { guilds: DiscordGuild[] }) {
    const {
        data: guildStats,
        isLoading,
        error,
    } = useGuildStats(
        guilds.map(g => g.id),
        {
            withClipCount: true,
            withAuthorCount: true,
        }
    );

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error.message}</div>;
    }

    if (!guildStats) {
        return <div>No guilds found.</div>;
    }

    return (
        <div>
            <h2 className="text-3xl">Your Servers</h2>
            <p className="text-gray-400">
                Select a server to manage clip scanning and settings
            </p>
            <ItemGrid className="pt-4">
                {guildStats.map(guildStats => (
                    <GuildEditItem guild={guildStats} key={guildStats.id} />
                ))}
            </ItemGrid>
        </div>
    );
}
