/**
 * Favorites API Types
 *
 * Type definitions for favorites-related API requests and responses.
 */

// ============================================================================
// Request Types
// ============================================================================

export interface FavoriteToggleRequest {
	clipIds?: string[]; // Optional for bulk operations
}

// ============================================================================
// Response Types
// ============================================================================

export interface FavoriteStatusResponse {
	isFavorited: boolean;
}

export interface FavoriteBulkResponse {
	success: boolean;
	added?: number; // For POST requests
	removed?: number; // For DELETE requests
	failed: number;
	clipIds: string[];
	missingClips?: string[]; // Clips that don't exist
	unauthorizedClips?: string[]; // Clips user can't access
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface FavoriteClipsParams {
	guildIds: string[]; // Guilds user has access to
	limit?: number;
	offset?: number;
	sort?: "asc" | "desc";
}
