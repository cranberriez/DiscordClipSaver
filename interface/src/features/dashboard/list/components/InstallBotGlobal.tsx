"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

export function InstallBot() {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            className="flex flex-col flex-1 items-center gap-8 rounded border border-accent/50 bg-accent/25 px-2 py-8 group/install"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <InstallPlusIcon hovered={hovered} />
            <h2 className="text-3xl">Add the Bot to Your Server</h2>
            <p className="text-gray-400 text-center max-w-lg">
                Add our bot to your server to start saving clips. You will need
                to activate clip scanning in the admin dashboard after adding
                the bot.
            </p>
            <InstallButton />
        </div>
    );
}

function InstallPlusIcon({ hovered }: { hovered: boolean }) {
    return (
        <a href={`/api/discord/bot/invite`}>
            <div
                className="flex items-center gap-2 rounded-full p-6 my-4 transition-colors duration-200"
                style={{
                    backgroundColor: hovered ? "#222222" : "#1b1b1b",
                    boxShadow: hovered
                        ? "0 0 32px 14px rgba(200, 200, 200, 0.45)"
                        : "0 0 22px 8px rgba(200, 200, 200, 0.18)",
                    color: hovered ? "#ffffff" : "#ffffff",
                    transition:
                        "background-color 200ms ease, color 200ms ease, box-shadow 200ms ease, transform 200ms ease",
                }}
            >
                <PlusIcon className="h-8 w-8" />
            </div>
        </a>
    );
}

function InstallButton() {
    const invitePath = `/api/discord/bot/invite`;

    return (
        <Button asChild>
            <a href={invitePath}>
                <PlusIcon className="mr-2 h-4 w-4" />
                <span className="mb-[2px]">Invite Bot</span>
            </a>
        </Button>
    );
}
