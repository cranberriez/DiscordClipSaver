"use client";

import { useMemo, useState } from "react";
import type { FullClip } from "@/lib/api/clip";

export interface ClipFiltersState {
    channelId: string | null;
    searchQuery: string;
    // Future filters:
    // authorId: string | null;
    // dateRange: { start: Date; end: Date } | null;
    // minDuration: number | null;
    // maxDuration: number | null;
}

const defaultFilters: ClipFiltersState = {
    channelId: null,
    searchQuery: "",
};

/**
 * Hook for client-side clip filtering.
 * Filters clips based on channel, search query, and other criteria.
 * 
 * @example
 * ```tsx
 * const { filteredClips, filters, setFilters } = useClipFilters(allClips);
 * 
 * return (
 *   <>
 *     <ClipFilters filters={filters} onFiltersChange={setFilters} />
 *     <ClipGrid clips={filteredClips} />
 *   </>
 * );
 * ```
 */
export function useClipFilters(clips: FullClip[]) {
    const [filters, setFilters] = useState<ClipFiltersState>(defaultFilters);

    const filteredClips = useMemo(() => {
        let result = clips;

        // Filter by channel
        if (filters.channelId) {
            result = result.filter(
                clip => clip.clip.channel_id === filters.channelId
            );
        }

        // Filter by search query
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            result = result.filter(clip => {
                const messageContent = clip.message.content?.toLowerCase() || "";
                const filename = clip.clip.filename.toLowerCase();
                return (
                    messageContent.includes(query) || filename.includes(query)
                );
            });
        }

        // Future filters can be added here:
        // - Author filter
        // - Date range
        // - Duration range
        // - Sort options

        return result;
    }, [clips, filters]);

    return {
        filters,
        setFilters,
        filteredClips,
        totalClips: clips.length,
        filteredCount: filteredClips.length,
    };
}
