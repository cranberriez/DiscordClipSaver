"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ChannelWithStats } from "@/lib/api/channel";

export interface ClipFiltersState {
    channelId: string | null;
    searchQuery: string;
    // Future filters:
    // authorId: string | null;
    // dateRange: { start: Date; end: Date } | null;
    // minDuration: number | null;
    // maxDuration: number | null;
}

interface ClipFiltersProps {
    channels: ChannelWithStats[];
    filters: ClipFiltersState;
    onFiltersChange: (filters: ClipFiltersState) => void;
    totalClips: number;
    filteredClips: number;
}

export function ClipFilters({
    channels,
    filters,
    onFiltersChange,
    totalClips,
    filteredClips,
}: ClipFiltersProps) {
    const handleChannelChange = (value: string) => {
        onFiltersChange({
            ...filters,
            channelId: value === "all" ? null : value,
        });
    };

    const handleSearchChange = (value: string) => {
        onFiltersChange({
            ...filters,
            searchQuery: value,
        });
    };

    const handleReset = () => {
        onFiltersChange({
            channelId: null,
            searchQuery: "",
        });
    };

    const hasActiveFilters = filters.channelId || filters.searchQuery;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Filters</CardTitle>
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                        >
                            Reset
                        </Button>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">
                    Showing {filteredClips} of {totalClips} clips
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Channel Filter */}
                <div className="space-y-2">
                    <Label htmlFor="channel-filter">Channel</Label>
                    <Select
                        value={filters.channelId || "all"}
                        onValueChange={handleChannelChange}
                    >
                        <SelectTrigger id="channel-filter">
                            <SelectValue placeholder="All channels" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All channels</SelectItem>
                            {channels.map(channel => (
                                <SelectItem key={channel.id} value={channel.id}>
                                    #{channel.name} ({channel.clip_count})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Search Filter */}
                <div className="space-y-2">
                    <Label htmlFor="search-filter">Search</Label>
                    <Input
                        id="search-filter"
                        placeholder="Search in messages..."
                        value={filters.searchQuery}
                        onChange={e => handleSearchChange(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Search by message content or filename
                    </p>
                </div>

                {/* Future filters can be added here:
                - Author filter
                - Date range picker
                - Duration range
                - Sort options
                */}
            </CardContent>
        </Card>
    );
}
