import { DiscordGuild } from "@/server/discord/types";
import { ItemGrid } from "@/components/layout";
import { GuildEditItem } from "./GuildEditItem";

export function YourServers({ guilds }: { guilds: DiscordGuild[] }) {
    return (
        <div>
            <h2 className="text-3xl">Your Servers</h2>
            <p className="text-gray-400">
                Select a server to manage clip scanning and settings
            </p>
            <ItemGrid className="pt-4">
                {guilds.map(guild => (
                    <GuildEditItem guild={guild} key={guild.id} />
                ))}
            </ItemGrid>
        </div>
    );
}
