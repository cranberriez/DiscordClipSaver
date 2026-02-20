/**
 * API Response Types
 *
 * These types define the shape of responses from our API routes.
 */

// ============================================================================
// Error Response
// ============================================================================

/**
 * Standard error response from API routes
 */
export interface APIErrorResponse {
	error: string;
	details?: unknown;
}

// ============================================================================
// Re-Exports
// ============================================================================

export * from "./guild";
export * from "./channel";
export * from "./clip";
export * from "./setting";
export * from "./scan";
