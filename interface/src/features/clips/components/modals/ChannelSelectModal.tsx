"use client";

import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Hash } from "lucide-react";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import type { ChannelWithStats } from "@/lib/api/channel";

interface ChannelSelectModalProps {
    channels: ChannelWithStats[];
    isLoading?: boolean;
}

export function ChannelSelectModal({
    channels,
    isLoading = false,
}: ChannelSelectModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const {
        isChannelModalOpen,
        closeChannelModal,
        selectedChannelIds,
        setChannelIds,
    } = useClipFiltersStore();

    // Filter out channels with 0 clips
    const channelsWithClips = useMemo(() => {
        return channels.filter(channel => channel.clip_count > 0);
    }, [channels]);

    // Filter channels by search query
    const filteredChannels = useMemo(() => {
        if (!searchQuery.trim()) return channelsWithClips;
        const query = searchQuery.toLowerCase();
        return channelsWithClips.filter(channel =>
            channel.name.toLowerCase().includes(query)
        );
    }, [channelsWithClips, searchQuery]);

    const handleToggleChannel = (channelId: string) => {
        if (selectedChannelIds.includes(channelId)) {
            setChannelIds(selectedChannelIds.filter(id => id !== channelId));
        } else {
            setChannelIds([...selectedChannelIds, channelId]);
        }
    };

    const handleSelectAll = () => {
        setChannelIds(channelsWithClips.map(c => c.id));
    };

    const handleClearAll = () => {
        setChannelIds([]);
    };

    const allSelected = selectedChannelIds.length === channelsWithClips.length;
    const noneSelected = selectedChannelIds.length === 0;

    return (
        <Dialog open={isChannelModalOpen} onOpenChange={closeChannelModal}>
            <DialogContent className="max-w-5xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Channels</DialogTitle>
                </DialogHeader>

                {/* Search bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search channels..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Bulk actions */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                        disabled={allSelected}
                    >
                        Select All
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearAll}
                        disabled={noneSelected}
                    >
                        Clear All
                    </Button>
                    <span className="text-sm text-muted-foreground ml-auto">
                        {selectedChannelIds.length} of{" "}
                        {channelsWithClips.length} selected
                    </span>
                </div>

                {/* Channel grid */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Loading channels...
                        </div>
                    ) : filteredChannels.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {searchQuery
                                ? "No channels match your search"
                                : "No channels with clips found"}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredChannels.map(channel => {
                                const isSelected = selectedChannelIds.includes(
                                    channel.id
                                );

                                return (
                                    <div
                                        key={channel.id}
                                        className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                                            isSelected
                                                ? "bg-primary/10 border-primary"
                                                : "hover:bg-muted"
                                        }`}
                                        onClick={() =>
                                            handleToggleChannel(channel.id)
                                        }
                                    >
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() =>
                                                handleToggleChannel(channel.id)
                                            }
                                            onClick={(e: React.MouseEvent) =>
                                                e.stopPropagation()
                                            }
                                        />

                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">
                                                    {channel.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {channel.clip_count}{" "}
                                                    {channel.clip_count === 1
                                                        ? "clip"
                                                        : "clips"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-4">
                    <Button onClick={closeChannelModal}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
