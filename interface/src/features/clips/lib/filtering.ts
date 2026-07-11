import type { SortType, SortOrder } from "@/lib/api/clip";

/**
 * Normalize a string for filter matching: lowercase and strip diacritics.
 * Emoji, spaces, and symbols pass through untouched, so channel names like
 * "SÖHO's clips" match "soho" and "memes 💀" matches "memes".
 */
export function normalizeText(s: string): string {
	return s
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "");
}

/** True when `candidate` contains `query` after normalization. */
export function matchesQuery(candidate: string, query: string): boolean {
	if (!query) return true;
	return normalizeText(candidate).includes(normalizeText(query));
}

// ============================================================================
// Sort options
// ============================================================================

export interface SortOption {
	sortType: SortType;
	sortOrder: SortOrder;
	label: string;
	group: string;
}

export const SORT_OPTIONS: SortOption[] = [
	{ sortType: "date", sortOrder: "desc", label: "Newest First", group: "Date" },
	{ sortType: "date", sortOrder: "asc", label: "Oldest First", group: "Date" },
	{
		sortType: "duration",
		sortOrder: "desc",
		label: "Longest First",
		group: "Duration",
	},
	{
		sortType: "duration",
		sortOrder: "asc",
		label: "Shortest First",
		group: "Duration",
	},
	{
		sortType: "likes",
		sortOrder: "desc",
		label: "Most Liked",
		group: "Likes",
	},
	{
		sortType: "random",
		sortOrder: "desc",
		label: "Randomize",
		group: "Other",
	},
];

export function getSortLabel(sortType: SortType, sortOrder: SortOrder): string {
	const match = SORT_OPTIONS.find(
		(o) =>
			o.sortType === sortType &&
			(o.sortType === "random" || o.sortOrder === sortOrder)
	);
	if (match) return match.label;
	// sortType "size" is reachable via URL but has no menu entry (parity with
	// the previous Sorting dropdown).
	if (sortType === "size")
		return sortOrder === "desc" ? "Largest First" : "Smallest First";
	return "Sort";
}

export const DEFAULT_SORT: { sortType: SortType; sortOrder: SortOrder } = {
	sortType: "date",
	sortOrder: "desc",
};

// ============================================================================
// Palette modes
// ============================================================================

export type PaletteMode = "channel" | "author" | "tag" | "sort";

/** Maps input selectors to palette modes. */
export const PALETTE_PREFIXES: Record<string, PaletteMode> = {
	"#": "channel",
	"@": "author",
	"!": "tag",
	sort: "sort",
};

/**
 * Parse palette input into a mode, its completion query, and any plain search
 * text before it. Selectors may start the input or follow search text.
 * "#tar" -> { mode: "channel", query: "tar" }
 * "funny moment #tar" ->
 *   { mode: "channel", query: "tar", searchText: "funny moment" }
 * "hello" -> { mode: null, query: "hello" }
 */
export function parsePaletteInput(value: string): {
	mode: PaletteMode | null;
	query: string;
	searchText: string;
} {
	let modeStart = -1;
	let mode: PaletteMode | null = null;
	let queryStart = -1;

	for (const match of value.matchAll(/(^|\s)([#@!])/g)) {
		const selectorStart = match.index + match[1].length;
		if (selectorStart >= modeStart) {
			modeStart = selectorStart;
			mode = PALETTE_PREFIXES[match[2]];
			queryStart = selectorStart + 1;
		}
	}

	for (const match of value.matchAll(/(^|\s)sort:/gi)) {
		const selectorStart = match.index + match[1].length;
		if (selectorStart >= modeStart) {
			modeStart = selectorStart;
			mode = "sort";
			queryStart = selectorStart + "sort:".length;
		}
	}

	if (mode && queryStart >= 0) {
		return {
			mode,
			query: value.slice(queryStart),
			searchText: value.slice(0, modeStart).trimEnd(),
		};
	}

	return { mode: null, query: value, searchText: value };
}
