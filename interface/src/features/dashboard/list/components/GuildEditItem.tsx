import { DiscordGuild } from "@/server/discord/types";
import { DiscordIcon } from "./DiscordGuildIcon";
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemActions,
    ItemTitle,
    ItemMedia,
} from "@/components/ui/item";
import { SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GuildEditItem({ guild }: { guild: DiscordGuild }) {
    return (
        <Item variant="outline">
            <DiscordIcon
                guildId={guild.id}
                iconUrl={guild.icon || ""}
                size="md"
            />

            <ItemContent>
                <ItemTitle>{guild.name}</ItemTitle>
                {/* <ItemDescription></ItemDescription> */}
            </ItemContent>
            <ItemActions>
                <Button variant="outline" aria-label="Edit" asChild>
                    <a
                        href={`/dashboard/${guild.id}`}
                        className="flex items-center gap-2"
                    >
                        <p className="mb-[2px]">Edit</p>
                        <SettingsIcon className="size-4" />
                    </a>
                </Button>
            </ItemActions>
        </Item>
    );
}
