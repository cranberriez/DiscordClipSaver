export function getDiscordWebUrl(
    guildId: string,
    channelId: string,
    messageId: string
) {
    return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

export function getDiscordAppUrl(
    guildId: string,
    channelId: string,
    messageId: string
) {
    return `discord://-/channels/${guildId}/${channelId}/${messageId}`;
}

/**
 * Builds your site URL to the clip detail.
 * If origin is omitted, it uses window.location.origin in the browser.
 * Returns empty string when not in a browser and origin not provided (SSR-safe).
 */
export function getSiteClipUrl(params: {
    guildId: string;
    channelId: string;
    clipId: string;
    origin?: string;
}) {
    const { guildId, channelId, clipId, origin } = params;
    const base =
        origin ?? (typeof window !== "undefined" ? window.location.origin : "");
    if (!base) return "";
    return new URL(`/clips/${guildId}/${channelId}/${clipId}`, base).toString();
}

/**
 * Attempts to open Discord app deep-link and falls back to web link after a short delay.
 * - Prefer calling from a user gesture (click) to avoid popup blockers.
 * - openTarget controls the web fallback target (default "_blank").
 */
export function openInDiscord(
    guildId: string,
    channelId: string,
    messageId: string,
    options?: { fallbackDelayMs?: number; openTarget?: "_blank" | "_self" }
) {
    const delay = options?.fallbackDelayMs ?? 800; // Increased delay for visibility check
    const target = options?.openTarget ?? "_blank";

    const appUrl = getDiscordAppUrl(guildId, channelId, messageId);
    const webUrl = getDiscordWebUrl(guildId, channelId, messageId);

    let fallbackTimer: ReturnType<typeof setTimeout>;

    const cleanup = () => {
        document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange
        );
        clearTimeout(fallbackTimer);
    };

    const handleVisibilityChange = () => {
        if (document.hidden) {
            // Page became hidden, assume app opened successfully.
            cleanup();
        }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Set a timer to fallback to the web URL.
    fallbackTimer = setTimeout(() => {
        // If this timer runs, the page was likely not hidden, so the app didn't open.
        window.open(webUrl, target);
        cleanup();
    }, delay);

    // Attempt to navigate to the Discord app.
    window.location.href = appUrl;

    // Return a cleanup function that can be called manually if needed.
    return cleanup;
}
