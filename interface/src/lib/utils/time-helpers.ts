/**
 * Format a date as a relative time string (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: Date | string | null): string {
    if (!date) return "Never";

    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) {
        return "Just now";
    } else if (diffMin < 60) {
        return `${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;
    } else if (diffHour < 24) {
        return `${diffHour} ${diffHour === 1 ? "hour" : "hours"} ago`;
    } else if (diffDay < 7) {
        return `${diffDay} ${diffDay === 1 ? "day" : "days"} ago`;
    } else if (diffWeek < 4) {
        return `${diffWeek} ${diffWeek === 1 ? "week" : "weeks"} ago`;
    } else if (diffMonth < 12) {
        return `${diffMonth} ${diffMonth === 1 ? "month" : "months"} ago`;
    } else {
        return `${diffYear} ${diffYear === 1 ? "year" : "years"} ago`;
    }
}

/**
 * Format duration in seconds to MM:SS format
 */
export function formatDuration(seconds: number | null): string {
    if (!seconds) return "Unknown";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Parse ISO timestamp to Date object
export function parseIsoDate(timestamp: Date): Date {
    return new Date(timestamp);
}

// Parse ISO timestamp to unix timestamps
export function parseIsoTimestamp(timestamp: Date): number {
    return new Date(timestamp).getTime() / 1000;
}
