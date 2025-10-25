import { cn } from "@/lib/utils";

export function DiscordIcon({
    guildId,
    iconUrl,
    size = "md",
}: {
    guildId: string;
    iconUrl: string;
    size?: "sm" | "md" | "lg";
}) {
    const sizeClasses = {
        sm: "w-10 h-10 min-w-10 min-h-10 rounded-lg",
        md: "w-16 h-16 min-w-16 min-h-16 rounded-xl",
        lg: "w-24 h-24 min-w-24 min-h-24 rounded-2xl",
    };

    let realUrl = "";

    if (iconUrl.includes("https://cdn.discordapp.com/icons/")) {
        realUrl = iconUrl;
    } else {
        realUrl = iconUrl
            ? `https://cdn.discordapp.com/icons/${guildId}/${iconUrl}.png?size=64`
            : "https://cdn.discordapp.com/embed/avatars/0.png?size=64";
    }

    return (
        <div className={cn("overflow-hidden aspect-square", sizeClasses[size])}>
            <img
                src={realUrl}
                className="w-full h-full object-cover aspect-square"
                alt="Guild icon"
            />
        </div>
    );
}
