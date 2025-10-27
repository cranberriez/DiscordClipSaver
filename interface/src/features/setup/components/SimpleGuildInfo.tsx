import { Guild } from "@/lib/api/guild";

export function SimpleGuildInfo({ guild }: { guild: Guild }) {
    if (!guild) {
        return null;
    }

    return (
        <div className="flex gap-2 items-center">
            <div>
                <img
                    src={guild.icon_url ?? ""}
                    alt={`${guild.name} icon`}
                    className="w-16 h-16 rounded-xl"
                />
            </div>
            <p className="text-lg font-semibold">{guild.name}</p>
        </div>
    );
}
