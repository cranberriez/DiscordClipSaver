import { useState } from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ExternalLink, Link2 } from "lucide-react";
import {
    getDiscordWebUrl,
    getSiteClipUrl,
} from "@/features/clips/lib/shareLinks";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useMemo } from "react";
import { Share2 } from "lucide-react";
import { openInDiscord } from "@/features/clips/lib/shareLinks";
import { useEffect } from "react";

export function SharePopover({
    guildId,
    channelId,
    messageId,
    clipId,
}: {
    guildId: string;
    channelId: string;
    messageId: string;
    clipId: string;
}) {
    const [open, setOpen] = useState(false);

    const discordWebUrl = useMemo(
        () => getDiscordWebUrl(guildId, channelId, messageId),
        [guildId, channelId, messageId]
    );

    const siteUrl = useMemo(() => {
        if (typeof window === "undefined") return "";
        return getSiteClipUrl({ guildId, channelId, clipId });
    }, [guildId, channelId, clipId]);

    async function copy(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            // TODO: toast.success("Copied link");
        } catch {
            // TODO: toast.error("Failed to copy");
        }
    }

    function handleOpenInDiscord() {
        openInDiscord(guildId, channelId, messageId);
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon-lg"
                    className="gap-1 text-muted-foreground hover:text-foreground"
                >
                    <Share2 className="w-4 h-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3">
                <div className="text-sm font-medium mb-2">Share</div>

                {/* Discord message */}
                <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                        <img
                            src="./discord-icon.svg"
                            alt="Discord"
                            className="w-4 h-4"
                        />
                        <span className="text-sm mb-0.5">Discord message</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleOpenInDiscord}
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                        <CopyButton
                            copyFn={() => copy(discordWebUrl)}
                            copyCb={() => setOpen(false)}
                        />
                    </div>
                </div>

                {/* Site link */}
                <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4" />
                        <span className="text-sm mb-0.5">Site link</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => window.open(siteUrl, "_blank")}
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                        <CopyButton
                            copyFn={() => copy(siteUrl)}
                            copyCb={() => setOpen(false)}
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

function CopyButton({
    copyFn,
    copyCb, // typically closes the popover
    copiedDurationMs = 650,
    closeDelayMs = 500,
}: {
    copyFn: () => void;
    copyCb: () => void;
    copiedDurationMs?: number;
    closeDelayMs?: number;
}) {
    const [copied, setCopied] = useState(false);
    const [clickCount, setClickCount] = useState(0);

    useEffect(() => {
        if (clickCount === 0) return;

        setCopied(true);

        const copiedTimer = setTimeout(() => {
            setCopied(false);
        }, copiedDurationMs);

        const closeTimer = setTimeout(() => {
            copyCb();
        }, closeDelayMs);

        // Cleanup function runs on unmount or if clickCount changes (new click)
        return () => {
            clearTimeout(copiedTimer);
            clearTimeout(closeTimer);
        };
    }, [clickCount, copyCb, copiedDurationMs, closeDelayMs]);

    const handleClick = () => {
        copyFn();
        setClickCount(prev => prev + 1);
    };

    return (
        <Button
            size="sm"
            variant="ghost"
            onClick={handleClick}
            aria-label="Copy link"
            className={cn(
                "transition-colors border-1 border-transparent relative",
                copied
                    ? "border-green-500 text-green-500 hover:text-green-500"
                    : ""
            )}
        >
            <Check
                className={cn("w-4 h-4", copied ? "opacity-100" : "opacity-0")}
            />
            <Copy
                className={cn(
                    "w-4 h-4 absolute",
                    copied ? "opacity-0" : "opacity-100"
                )}
            />
        </Button>
    );
}
