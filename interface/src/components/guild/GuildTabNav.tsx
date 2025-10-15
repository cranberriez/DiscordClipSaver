"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface GuildTabNavProps {
    guildId: string;
}

export function GuildTabNav({ guildId }: GuildTabNavProps) {
    const pathname = usePathname();

    const tabs = [
        { id: "channels", label: "Channels", href: `/dashboard/${guildId}/channels` },
        { id: "scans", label: "Scans", href: `/dashboard/${guildId}/scans` },
        { id: "settings", label: "Settings", href: `/dashboard/${guildId}/settings` },
        { id: "debug", label: "Debug", href: `/dashboard/${guildId}/debug` },
    ];

    return (
        <div className="border-b border-white/20 mt-6">
            <nav className="flex gap-4" aria-label="Guild tabs">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href;
                    
                    return (
                        <Link
                            key={tab.id}
                            href={tab.href}
                            className={`
                                px-4 py-2 text-sm font-medium border-b-2 transition-colors
                                ${
                                    isActive
                                        ? "border-blue-500 text-blue-400"
                                        : "border-transparent text-gray-400 hover:text-white hover:border-white/20"
                                }
                            `}
                            aria-current={isActive ? "page" : undefined}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
