"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface GuildTabNavProps {
    guildId: string;
}

export function GuildTabNav({ guildId }: GuildTabNavProps) {
    const pathname = usePathname();

    const tabs = [
        {
            id: "channels",
            label: "Channels",
            href: `/dashboard/${guildId}/channels`,
        },
        { id: "scans", label: "Scans", href: `/dashboard/${guildId}/scans` },
        {
            id: "settings",
            label: "Settings",
            href: `/dashboard/${guildId}/settings`,
        },
        { id: "debug", label: "Debug", href: `/dashboard/${guildId}/debug` },
    ];

    return (
        <div className="border-b mt-6">
            <nav className="flex gap-1" aria-label="Guild tabs" role="tablist">
                {tabs.map(tab => {
                    const isActive = pathname === tab.href;

                    return (
                        <Link
                            key={tab.id}
                            href={tab.href}
                            role="tab"
                            aria-selected={isActive}
                            className={cn(
                                "inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-medium transition-all",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                "disabled:pointer-events-none disabled:opacity-50 border-b-2 border-transparent",
                                isActive
                                    ? "bg-background text-foreground shadow-sm border-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
