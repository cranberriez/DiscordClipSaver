import { DiscordIcon } from "./DiscordGuildIcon";
import {
    Item,
    ItemContent,
    ItemActions,
    ItemTitle,
} from "@/components/ui/item";
import {
    SettingsIcon,
    FilmIcon,
    UserIcon,
    XIcon,
    CheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GuildWithStats } from "@/lib/api/guild";
import { shorthandCount } from "@/lib/utils/count-helpers";

export function GuildEditItem({ guild }: { guild: GuildWithStats }) {
    const isEnabled = guild.message_scan_enabled;
    const clipCount = guild.clip_count || 0;
    const authorCount = guild.author_count || 0;

    return (
        <Item variant="outline" className="p-2 rounded-2xl">
            <DiscordIcon
                guildId={guild.id}
                iconUrl={guild.icon_url || ""}
                size="md"
            />

            <ItemContent>
                <ItemTitle className="line-clamp-2">{guild.name}</ItemTitle>

                <GuildEditItemBadges
                    enabled={isEnabled}
                    clipCount={clipCount}
                    authorCount={authorCount}
                />
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

function GuildEditItemBadges({
    enabled,
    clipCount,
    authorCount,
}: {
    enabled: boolean;
    clipCount: number;
    authorCount: number;
}) {
    return (
        <div className="flex items-center gap-2">
            {enabled ? (
                <div className="bg-green-500/20 text-green-400 p-[2px] rounded">
                    <CheckIcon className="size-4" />
                </div>
            ) : (
                <div className="bg-red-500/20 text-red-400 p-[2px] rounded">
                    <XIcon className="size-4" />
                </div>
            )}
            <div className="flex items-center gap-1">
                <FilmIcon className="size-4" />
                <p>{shorthandCount(clipCount)}</p>
            </div>
            <div className="flex items-center gap-1">
                <UserIcon className="size-4" />
                <p>{shorthandCount(authorCount)}</p>
            </div>
        </div>
    );
}
