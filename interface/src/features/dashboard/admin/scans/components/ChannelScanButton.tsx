"use client";

import { ButtonGroup } from "@/components/ui/button-group";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical, InfoIcon } from "lucide-react";
import type { ChannelWithStatus } from "../types";
import { Button } from "@/components/ui/button";
import {
    HoverCard,
    HoverCardTrigger,
    HoverCardContent,
} from "@/components/ui/hover-card";
import { useStartCustomScan } from "@/lib/hooks/useScans";
import { StartScanOptions } from "@/lib/api/scan";
import { toast } from "sonner";

export function ChannelScanButton({ channel }: { channel: ChannelWithStatus }) {
    const { isPending, start } = useStartCustomScan(channel.guild_id);

    const handleStart = (options?: StartScanOptions) => {
        start(channel.id, options, {
            onSuccess: () => {
                toast("Scan started successfully");
            },
            onError: err => {
                toast("Failed to start scan: " + err);
            },
        });
    };

    const isDisabled =
        !channel.message_scan_enabled ||
        isPending ||
        channel.scanStatus?.status === "RUNNING" ||
        channel.scanStatus?.status === "QUEUED";

    const title = !channel.message_scan_enabled
        ? "Enable scanning in Overview tab first"
        : "";

    const buttonText = !channel.message_scan_enabled
        ? "Disabled"
        : channel.scanStatus?.status === "RUNNING"
        ? "Running..."
        : channel.scanStatus?.status === "QUEUED"
        ? "Queued..."
        : "Scan";

    return (
        <ButtonGroup className="ml-auto">
            <Button
                onClick={() => handleStart()}
                disabled={isDisabled}
                variant="outline"
                size="sm"
                title={title}
            >
                {buttonText}
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                        <EllipsisVertical />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <MenuItemWithInfo
                        onClick={() => handleStart()}
                        disabled={isDisabled}
                        hoverText="Scan channel for new clips, in case you don't see any newly added clips."
                    >
                        Forward Update Scan
                    </MenuItemWithInfo>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-muted-foreground">
                        Historical
                    </DropdownMenuLabel>

                    <MenuItemWithInfo
                        onClick={() =>
                            handleStart({
                                isUpdate: false,
                                isHistorical: true,
                                limit: 1000,
                                autoContinue: true,
                                rescan: "stop",
                            })
                        }
                        disabled={isDisabled}
                        hoverText="Scan channel backwards for all clips, in case you don't see any newly added clips."
                    >
                        Historical Scan
                    </MenuItemWithInfo>

                    <MenuItemWithInfo
                        onClick={() =>
                            handleStart({
                                isUpdate: false,
                                isHistorical: true,
                                limit: 1000,
                                autoContinue: true,
                                rescan: "continue",
                            })
                        }
                        disabled={isDisabled}
                        hoverText="Scan channel backwards for all clips, continuing all the way until the beginning."
                    >
                        Historical Hard Re-Scan
                    </MenuItemWithInfo>
                </DropdownMenuContent>
            </DropdownMenu>
        </ButtonGroup>
    );
}

function MenuItemWithInfo({
    onClick,
    disabled,
    children,
    hoverText,
}: {
    onClick: () => void;
    disabled: boolean;
    children: React.ReactNode;
    hoverText: string;
}) {
    return (
        <DropdownMenuItem
            onClick={onClick}
            disabled={disabled}
            className="cursor-pointer"
        >
            {children}
            <HoverCard>
                <HoverCardTrigger className="ml-auto">
                    <InfoIcon />
                </HoverCardTrigger>
                <HoverCardContent align="center" side="right">
                    <p>{hoverText}</p>
                </HoverCardContent>
            </HoverCard>
        </DropdownMenuItem>
    );
}
