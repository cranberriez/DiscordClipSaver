/**
 * TanStack Query Definitions for Favorites
 * 
 * Query options and keys for favorites-related API calls.
 * Follows the established API → Query → Hook pattern.
 */

import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { 
    FavoriteStatusResponse, 
    FavoriteBulkResponse 
} from "@/lib/api/favorites";

// ============================================================================
// Query Keys
// ============================================================================

export const favoriteKeys = {
    all: ["favorites"] as const,
    status: (clipId: string) => ["favorites", "status", clipId] as const,
    lists: ["favorites", "lists"] as const,
    list: (guildIds: string[]) => ["favorites", "lists", ...guildIds.sort()] as const,
} as const;

// ============================================================================
// Query Options
// ============================================================================

/**
 * Query to check if a clip is favorited by the current user
 */
export function favoriteStatusQuery(clipId: string) {
    return queryOptions({
        queryKey: favoriteKeys.status(clipId),
        queryFn: () => api.favorites.status(clipId),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000,   // 10 minutes
    });
}

// ============================================================================
// Mutation Options
// ============================================================================

/**
 * Mutation to add a single clip to favorites
 */
export const addFavoriteMutation = {
    mutationFn: (clipId: string) => api.favorites.add(clipId),
} as const;

/**
 * Mutation to add multiple clips to favorites
 */
export const addMultipleFavoritesMutation = {
    mutationFn: (clipIds: string[]) => api.favorites.addMultiple(clipIds),
} as const;

/**
 * Mutation to remove a single clip from favorites
 */
export const removeFavoriteMutation = {
    mutationFn: (clipId: string) => api.favorites.remove(clipId),
} as const;

/**
 * Mutation to remove multiple clips from favorites
 */
export const removeMultipleFavoritesMutation = {
    mutationFn: (clipIds: string[]) => api.favorites.removeMultiple(clipIds),
} as const;

/**
 * Mutation to toggle favorite status for a single clip
 */
export const toggleFavoriteMutation = {
    mutationFn: (clipId: string) => api.favorites.toggle(clipId),
} as const;
