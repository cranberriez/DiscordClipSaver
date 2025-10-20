import "server-only";

/**
 * Discord API Client
 * 
 * Provides centralized Discord API access with:
 * - Automatic retry on 429 rate limits
 * - Exponential backoff
 * - Consistent error handling
 */

const DISCORD_API_BASE = "https://discord.com/api/v10";

// ============================================================================
// Types
// ============================================================================

export interface DiscordFetchOptions {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: any;
    maxRetries?: number;
    retryDelay?: number; // Initial retry delay in ms (will use exponential backoff)
}

export class DiscordAPIError extends Error {
    constructor(
        message: string,
        public status: number,
        public retryAfter?: string,
        public response?: Response
    ) {
        super(message);
        this.name = "DiscordAPIError";
    }
}

// ============================================================================
// Core Fetch with Retry
// ============================================================================

/**
 * Make a request to Discord API with automatic retry on 429.
 * 
 * @param path - API path (e.g., "/users/@me/guilds")
 * @param accessToken - Discord OAuth2 access token
 * @param options - Request options including retry configuration
 * @returns Parsed JSON response
 * 
 * @example
 * ```typescript
 * const guilds = await discordFetch<DiscordGuild[]>(
 *   "/users/@me/guilds",
 *   token,
 *   { maxRetries: 3 }
 * )
 * ```
 */
export async function discordFetch<T>(
    path: string,
    accessToken: string,
    options: DiscordFetchOptions = {}
): Promise<T> {
    const {
        method = "GET",
        body,
        maxRetries = 3,
        retryDelay = 1000,
    } = options;

    let lastError: DiscordAPIError | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const headers: HeadersInit = {
                Authorization: `Bearer ${accessToken}`,
            };
            
            if (body) {
                headers["Content-Type"] = "application/json";
            }

            const res = await fetch(`${DISCORD_API_BASE}${path}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                cache: "no-store",
            });

            // Success - parse and return
            if (res.ok) {
                return (await res.json()) as T;
            }

            // Handle rate limit (429)
            if (res.status === 429) {
                const retryAfterHeader = res.headers.get("Retry-After");
                const retryAfterMs = retryAfterHeader
                    ? parseFloat(retryAfterHeader) * 1000
                    : retryDelay * Math.pow(2, attempt); // Exponential backoff

                lastError = new DiscordAPIError(
                    `Rate limited by Discord (attempt ${attempt + 1}/${maxRetries + 1})`,
                    429,
                    retryAfterHeader ?? undefined,
                    res
                );

                // If we've exhausted retries, throw
                if (attempt >= maxRetries) {
                    throw lastError;
                }

                // Log retry attempt
                console.warn(
                    `Discord rate limit hit, retrying in ${retryAfterMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`,
                    { path, retryAfter: retryAfterHeader }
                );

                // Wait before retrying
                await sleep(retryAfterMs);
                continue; // Retry
            }

            // Other errors - don't retry
            throw new DiscordAPIError(
                `Discord API error: ${res.status} ${res.statusText}`,
                res.status,
                undefined,
                res
            );
        } catch (err) {
            // If it's our DiscordAPIError from rate limit, continue to retry
            if (err instanceof DiscordAPIError && err.status === 429) {
                lastError = err;
                continue;
            }
            // Other errors - re-throw immediately
            throw err;
        }
    }

    // Should never reach here, but just in case
    throw lastError || new Error("Max retries exceeded");
}

// ============================================================================
// Convenience Methods
// ============================================================================

/**
 * Get current user's Discord profile
 */
export async function getCurrentUser(
    accessToken: string
): Promise<{ id: string; username: string; discriminator: string; avatar?: string }> {
    return discordFetch("/users/@me", accessToken);
}

/**
 * Get guilds the current user is a member of
 */
export async function getUserGuilds(
    accessToken: string
): Promise<Array<any>> {
    return discordFetch("/users/@me/guilds", accessToken);
}

// ============================================================================
// Helpers
// ============================================================================

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
