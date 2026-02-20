/**
 * Format a date as a relative time string with smart fallback to absolute dates
 *
 * Rules:
 * 0-7 days: relative with precision ("3 hours ago", "Yesterday", "6 days ago")
 * 8-90 days: relative with less precision ("2 weeks ago", "1 month ago")
 * >90 days or previous year: absolute date ("Oct 12" or "Oct 12, 2024")
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

	// More than 90 days or previous calendar year - use absolute date
	if (diffDay > 90 || past.getFullYear() !== now.getFullYear()) {
		return formatDateShort(past);
	}

	// 8-90 days - less precision relative time
	if (diffDay >= 8) {
		if (diffMonth >= 2) {
			return `${diffMonth} month${diffMonth === 1 ? "" : "s"} ago`;
		} else if (diffWeek >= 2) {
			return `${diffWeek} week${diffWeek === 1 ? "" : "s"} ago`;
		} else if (diffWeek >= 1) {
			return `${diffWeek} week${diffWeek === 1 ? "" : "s"} ago`;
		} else {
			return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
		}
	}

	// 0-7 days - more precision relative time
	if (diffSec < 60) {
		return "Just now";
	} else if (diffMin < 60) {
		return `${diffMin} hour${diffMin === 1 ? "" : "s"} ago`;
	} else if (diffHour < 24) {
		return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
	} else if (diffDay === 1) {
		return "Yesterday";
	} else {
		return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
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

/**
 * Format a date as "Month Day, Year" (e.g., "Jan 15, 2024")
 */
export function formatDateShort(date: Date | string | null): string {
	if (!date) return "";

	const d = new Date(date);
	const months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	const month = months[d.getMonth()];
	const day = d.getDate();
	const year = d.getFullYear();

	return `${month} ${day}, ${year}`;
}
