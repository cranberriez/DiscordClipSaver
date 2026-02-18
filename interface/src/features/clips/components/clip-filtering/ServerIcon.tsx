import { Server } from "lucide-react";

export function ServerIcon({
    guildIcon,
    guildName,
}: {
    guildIcon: string | null;
    guildName: string;
}) {
    return (
        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 relative">
            {guildIcon ? (
                <img
                    src={guildIcon}
                    alt={guildName || "Guild Icon"}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="flex items-center justify-center w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-muted">
                    <Server className="w-8 h-8 text-muted-foreground" />
                </div>
            )}
        </div>
    );
}
