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
import { Search, Server } from "lucide-react";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import type { GuildWithStats } from "@/lib/api/guild";

interface GuildSelectModalProps {
    guilds: GuildWithStats[];
    isLoading?: boolean;
}

export function GuildSelectModal({
    guilds,
    isLoading = false,
}: GuildSelectModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const { isGuildModalOpen, closeGuildModal, setGuildId, selectedGuildId } =
        useClipFiltersStore();

    // Filter guilds by search query
    const filteredGuilds = useMemo(() => {
        if (!searchQuery.trim()) return guilds;
        const query = searchQuery.toLowerCase();
        return guilds.filter(guild => guild.name.toLowerCase().includes(query));
    }, [guilds, searchQuery]);

    const handleSelectGuild = (guildId: string) => {
        setGuildId(guildId);
        closeGuildModal();
        setSearchQuery("");
    };

    const getGuildIconUrl = (guild: GuildWithStats): string | null => {
        return guild.icon_url;
    };

    return (
        <Dialog open={isGuildModalOpen} onOpenChange={closeGuildModal}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select a Server</DialogTitle>
                </DialogHeader>

                {/* Search bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search servers..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Guild grid */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Loading servers...
                        </div>
                    ) : filteredGuilds.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {searchQuery
                                ? "No servers match your search"
                                : "No servers with clips found"}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredGuilds.map(guild => {
                                const iconUrl = getGuildIconUrl(guild);
                                const isSelected = selectedGuildId === guild.id;

                                return (
                                    <button
                                        key={guild.id}
                                        className={`h-auto p-4 rounded-lg border transition-colors text-left ${
                                            isSelected
                                                ? "border-white bg-muted/50"
                                                : "border-border bg-card hover:bg-muted/30"
                                        }`}
                                        onClick={() =>
                                            handleSelectGuild(guild.id)
                                        }
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            {/* Guild icon */}
                                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                                {iconUrl ? (
                                                    <img
                                                        src={iconUrl}
                                                        alt={guild.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Server className="w-6 h-6 text-muted-foreground" />
                                                )}
                                            </div>

                                            {/* Guild info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold truncate">
                                                    {guild.name}
                                                </p>
                                                <p
                                                    className={`text-xs ${
                                                        guild.clip_count === 0
                                                            ? "text-red-500 font-medium"
                                                            : "text-muted-foreground"
                                                    }`}
                                                >
                                                    {guild.clip_count === 0
                                                        ? "No Clips"
                                                        : `${
                                                              guild.clip_count
                                                          } ${
                                                              guild.clip_count ===
                                                              1
                                                                  ? "clip"
                                                                  : "clips"
                                                          }`}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-4">
                    <Button onClick={closeGuildModal}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
