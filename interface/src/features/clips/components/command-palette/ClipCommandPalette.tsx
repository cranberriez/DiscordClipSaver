"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { ArrowRight, Check, Hash, Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/core/UserAvatar";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import { useGuildTags } from "@/lib/queries/tags";
import {
	SORT_OPTIONS,
	matchesQuery,
	normalizeText,
	parsePaletteInput,
	type PaletteMode,
} from "../../lib/filtering";
import { FilterToken } from "../command-bar/FilterToken";
import { cn } from "@/lib/utils";
import type { ChannelWithStats } from "@/lib/api/channel";
import type { AuthorWithStats } from "@/lib/api/author";

interface PaletteRow {
	key: string;
	content: ReactNode;
	onSelect: () => void;
	/** Keep the palette open after selecting (multi-select toggles) */
	keepOpen?: boolean;
	/** Reset the input to this value after selecting while the palette stays open. */
	valueAfterSelect?: string;
}

interface Section {
	heading: string;
	rows: PaletteRow[];
}

const MODE_LABELS: Record<PaletteMode, string> = {
	channel: "channel",
	author: "author",
	tag: "tag",
	sort: "sort",
};

/** Bright, token-coordinated colors for mode prefixes on the dark popover. */
const MODE_COLORS: Record<PaletteMode, string> = {
	channel: "text-indigo-300",
	author: "text-emerald-300",
	tag: "text-amber-300",
	sort: "text-sky-300",
};

interface ClipCommandPaletteProps {
	channels: ChannelWithStats[];
	authors: AuthorWithStats[];
}

/**
 * Ctrl-K command palette - the single hub for filtering clips.
 *
 * Plain text = clip search. Selectors switch modes: `#` channels, `@`
 * authors, `!` tags, `sort:` sort order. Values are committed by selection
 * (IDs/slugs go to the store), so channel and author names containing emoji,
 * spaces, or symbols never need parsing. Matching is case- and
 * diacritic-insensitive.
 */
export function ClipCommandPalette({
	channels,
	authors,
}: ClipCommandPaletteProps) {
	const {
		selectedGuildId,
		selectedChannelIds,
		selectedAuthorIds,
		tags: selectedTags,
		searchQuery,
		sortType,
		sortOrder,
		isPaletteOpen,
		paletteSeed,
		closePalette,
		setChannelIds,
		setAuthorIds,
		setTags,
		setSearchQuery,
		setSortType,
		setSortOrder,
	} = useClipFiltersStore();

	const { data: tags = [] } = useGuildTags(selectedGuildId || "");

	const [value, setValue] = useState("");
	const [hot, setHot] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	// Apply an explicit mode seed, or restore the current clip search so it
	// remains editable after the active filter tokens.
	useEffect(() => {
		if (isPaletteOpen) {
			setValue(paletteSeed || searchQuery);
			setHot(paletteSeed ? 0 : -1);
		}
	}, [isPaletteOpen, paletteSeed, searchQuery]);

	const { mode, query, searchText } = parsePaletteInput(value);

	// ------------------------------------------------------------------
	// Data helpers
	// ------------------------------------------------------------------
	const selectableChannels = useMemo(
		() =>
			channels
				.filter((c) => c.type !== "category")
				.sort((a, b) =>
					normalizeText(a.name).localeCompare(normalizeText(b.name))
				),
		[channels]
	);

	// Category names, when the channels payload includes category rows.
	const categoryNames = useMemo(() => {
		const map = new Map<string, string>();
		for (const c of channels) {
			if (c.type === "category") map.set(c.id, c.name);
		}
		return map;
	}, [channels]);

	const sortedAuthors = useMemo(
		() =>
			[...authors].sort((a, b) =>
				normalizeText(a.display_name).localeCompare(
					normalizeText(b.display_name)
				)
			),
		[authors]
	);

	const activeTags = useMemo(() => tags.filter((t) => t.is_active), [tags]);

	const toggleIn = useCallback(
		(list: string[], setter: (v: string[]) => void, id: string) => {
			setter(
				list.includes(id) ? list.filter((v) => v !== id) : [...list, id]
			);
		},
		[]
	);

	// ------------------------------------------------------------------
	// Row builders
	// ------------------------------------------------------------------
	const channelRow = useCallback(
		(c: ChannelWithStats): PaletteRow => ({
			key: `ch-${c.id}`,
			keepOpen: true,
			valueAfterSelect: "#",
			onSelect: () => toggleIn(selectedChannelIds, setChannelIds, c.id),
			content: (
				<>
					<Check
						className={cn(
							"text-primary h-4 w-4 flex-none",
							!selectedChannelIds.includes(c.id) && "invisible"
						)}
					/>
					<Hash className="text-muted-foreground h-3.5 w-3.5 flex-none" />
					<span className="truncate">{c.name}</span>
					{c.parent_id && categoryNames.get(c.parent_id) && (
						<span className="text-muted-foreground/70 truncate text-xs">
							{categoryNames.get(c.parent_id)}
						</span>
					)}
					<span className="text-muted-foreground ml-auto flex-none text-xs">
						{c.clip_count.toLocaleString()} clips
					</span>
				</>
			),
		}),
		[selectedChannelIds, setChannelIds, toggleIn, categoryNames]
	);

	const authorRow = useCallback(
		(a: AuthorWithStats): PaletteRow => ({
			key: `au-${a.user_id}`,
			keepOpen: true,
			valueAfterSelect: "@",
			onSelect: () =>
				toggleIn(selectedAuthorIds, setAuthorIds, a.user_id),
			content: (
				<>
					<Check
						className={cn(
							"text-primary h-4 w-4 flex-none",
							!selectedAuthorIds.includes(a.user_id) &&
								"invisible"
						)}
					/>
					<UserAvatar
						userId={a.user_id}
						username={a.display_name}
						avatarUrl={a.avatar_url ?? undefined}
						size="sm"
						showName={false}
					/>
					<span className="truncate">{a.display_name}</span>
					{a.clip_count != null && (
						<span className="text-muted-foreground ml-auto flex-none text-xs">
							{a.clip_count.toLocaleString()} clips
						</span>
					)}
				</>
			),
		}),
		[selectedAuthorIds, setAuthorIds, toggleIn]
	);

	// ------------------------------------------------------------------
	// Sections for the current input
	// ------------------------------------------------------------------
	const sections = useMemo<Section[]>(() => {
		if (mode === "channel") {
			const matches = selectableChannels.filter((c) =>
				matchesQuery(c.name, query)
			);
			const withClips = matches.filter((c) => c.clip_count > 0);
			const withoutClips = matches.filter((c) => c.clip_count === 0);
			return [
				{
					heading: `Channels with clips - ${withClips.length}`,
					rows: withClips.map(channelRow),
				},
				{
					heading: `Channels with no clips - ${withoutClips.length}`,
					rows: withoutClips.map(channelRow),
				},
			];
		}

		if (mode === "author") {
			const matches = sortedAuthors.filter((a) =>
				matchesQuery(a.display_name, query)
			);
			const withClips = matches.filter((a) => (a.clip_count ?? 0) > 0);
			const withoutClips = matches.filter(
				(a) => (a.clip_count ?? 0) === 0
			);
			return [
				{
					heading: `Authors with clips - ${withClips.length}`,
					rows: withClips.map(authorRow),
				},
				{
					heading: `Authors with no clips - ${withoutClips.length}`,
					rows: withoutClips.map(authorRow),
				},
			];
		}

		if (mode === "tag") {
			const matches = activeTags.filter(
				(t) =>
					matchesQuery(t.name, query) || matchesQuery(t.slug, query)
			);
			return [
				{
					heading: `Tags - ${matches.length} of ${activeTags.length}`,
					rows: matches.map((t) => ({
						key: `tag-${t.slug}`,
						keepOpen: true,
						valueAfterSelect: "!",
						onSelect: () => toggleIn(selectedTags, setTags, t.slug),
						content: (
							<>
								<Check
									className={cn(
										"text-primary h-4 w-4 flex-none",
										!selectedTags.includes(t.slug) &&
											"invisible"
									)}
								/>
								{t.color && (
									<span
										className="h-2.5 w-2.5 flex-none rounded-full"
										style={{ backgroundColor: t.color }}
									/>
								)}
								<span className="truncate">{t.name}</span>
							</>
						),
					})),
				},
			];
		}

		if (mode === "sort") {
			const matches = SORT_OPTIONS.filter(
				(o) =>
					matchesQuery(o.label, query) || matchesQuery(o.group, query)
			);
			return [
				{
					heading: "Sort order",
					rows: matches.map((o) => ({
						key: `sort-${o.sortType}-${o.sortOrder}`,
						keepOpen: true,
						valueAfterSelect: "sort:",
						onSelect: () => {
							setSortType(o.sortType);
							setSortOrder(o.sortOrder);
						},
						content: (
							<>
								<Check
									className={cn(
										"text-primary h-4 w-4 flex-none",
										!(
											sortType === o.sortType &&
											(o.sortType === "random" ||
												sortOrder === o.sortOrder)
										) && "invisible"
									)}
								/>
								<span>{o.label}</span>
								<span className="text-muted-foreground ml-auto flex-none text-xs">
									{o.group}
								</span>
							</>
						),
					})),
				},
			];
		}

		// -------- default view (no mode) --------
		const result: Section[] = [];
		const trimmed = query.trim();

		if (trimmed) {
			result.push({
				heading: "Search",
				rows: [
					{
						key: "search-commit",
						onSelect: () => setSearchQuery(trimmed),
						content: (
							<>
								<Search className="text-muted-foreground h-4 w-4 flex-none" />
								<span className="truncate">
									Search clips for &quot;
									<span className="text-foreground font-semibold">
										{trimmed}
									</span>
									&quot;
								</span>
								<kbd className="border-border bg-sidebar text-muted-foreground ml-auto flex-none rounded border px-1.5 font-mono text-[10px]">
									↵
								</kbd>
							</>
						),
					},
				],
			});
		}

		result.push({
			heading: "Refine",
			rows: (
				[
					[
						"#",
						"Filter by channel",
						`${selectableChannels.length} channels`,
						MODE_COLORS.channel,
					],
					[
						"@",
						"Filter by author",
						`${sortedAuthors.length} authors`,
						MODE_COLORS.author,
					],
					[
						"!",
						"Filter by tag",
						`${activeTags.length} tags`,
						MODE_COLORS.tag,
					],
					["sort:", "Change sort order", "", MODE_COLORS.sort],
				] as const
			).map(([prefix, label, right, colorClass]) => ({
				key: `seed-${prefix}`,
				keepOpen: true,
				onSelect: () => {
					setValue(
						`${query.trimEnd()}${query.trim() ? " " : ""}${prefix}`
					);
					setHot(0);
					inputRef.current?.focus();
				},
				content: (
					<>
						<span
							className={cn(
								"w-10 flex-none font-mono text-xs font-semibold",
								colorClass
							)}
						>
							{prefix}
						</span>
						<span>{label}</span>
						{right && (
							<span className="text-muted-foreground ml-auto flex-none text-xs">
								{right}
							</span>
						)}
					</>
				),
			})),
		});

		const topChannels = [...selectableChannels]
			.sort((a, b) => b.clip_count - a.clip_count)
			.slice(0, 5);
		if (topChannels.length > 0) {
			result.push({
				heading: "Top channels",
				rows: topChannels.map(channelRow),
			});
		}

		const topAuthors = [...sortedAuthors]
			.sort((a, b) => (b.clip_count ?? 0) - (a.clip_count ?? 0))
			.slice(0, 5);
		if (topAuthors.length > 0) {
			result.push({
				heading: "Top authors",
				rows: topAuthors.map(authorRow),
			});
		}

		return result;
	}, [
		mode,
		query,
		selectableChannels,
		sortedAuthors,
		activeTags,
		selectedTags,
		sortType,
		sortOrder,
		channelRow,
		authorRow,
		toggleIn,
		setTags,
		setSortType,
		setSortOrder,
		setSearchQuery,
	]);

	const flatRows = useMemo(() => sections.flatMap((s) => s.rows), [sections]);

	// Clamp the highlighted row when the list shrinks
	useEffect(() => {
		if (hot >= flatRows.length) setHot(flatRows.length === 0 ? -1 : 0);
	}, [flatRows.length, hot]);

	// Keep the highlighted row in view
	useEffect(() => {
		listRef.current
			?.querySelector(`[data-row-index="${hot}"]`)
			?.scrollIntoView({ block: "nearest" });
	}, [hot]);

	// ------------------------------------------------------------------
	// Active filter tokens shown in the input row
	// ------------------------------------------------------------------
	const channelNames = useMemo(
		() => new Map(channels.map((c) => [c.id, c.name])),
		[channels]
	);
	const authorNames = useMemo(
		() => new Map(authors.map((a) => [a.user_id, a.display_name])),
		[authors]
	);
	const tagNames = useMemo(
		() => new Map(tags.map((t) => [t.slug, t.name])),
		[tags]
	);

	const inputTokens = useMemo(
		() => [
			...selectedChannelIds.map((id) => ({
				variant: "channel" as const,
				label: channelNames.get(id) ?? id,
				remove: () =>
					setChannelIds(selectedChannelIds.filter((v) => v !== id)),
			})),
			...selectedAuthorIds.map((id) => ({
				variant: "author" as const,
				label: authorNames.get(id) ?? id,
				remove: () =>
					setAuthorIds(selectedAuthorIds.filter((v) => v !== id)),
			})),
			...selectedTags.map((slug) => ({
				variant: "tag" as const,
				label: tagNames.get(slug) ?? slug,
				remove: () => setTags(selectedTags.filter((v) => v !== slug)),
			})),
		],
		[
			selectedChannelIds,
			selectedAuthorIds,
			selectedTags,
			channelNames,
			authorNames,
			tagNames,
			setChannelIds,
			setAuthorIds,
			setTags,
		]
	);

	// ------------------------------------------------------------------
	// Handlers
	// ------------------------------------------------------------------
	const submitSearch = () => {
		setSearchQuery(value.trim());
		closePalette();
	};

	const selectRow = (index: number) => {
		const row = flatRows[index];
		if (!row) return;
		row.onSelect();
		if (!row.keepOpen) closePalette();
		else {
			if (row.valueAfterSelect !== undefined) {
				const nextValue =
					mode && searchText
						? `${searchText} `
						: row.valueAfterSelect;
				setValue(nextValue);
				setHot(mode && searchText ? -1 : 0);
			}
			inputRef.current?.focus();
		}
	};

	const activateArrow = () => {
		if (mode) selectRow(hot >= 0 ? hot : 0);
		else submitSearch();
	};

	const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			const optionCount = flatRows.length + 1;
			const direction = e.key === "ArrowDown" ? 1 : -1;
			setHot(
				(h) => ((h + 1 + direction + optionCount) % optionCount) - 1
			);
			return;
		}
		if (e.key === "Enter") {
			e.preventDefault();
			if (hot === -1) activateArrow();
			else selectRow(hot);
			return;
		}
		if (e.key === "Backspace" && value === "" && inputTokens.length > 0) {
			inputTokens[inputTokens.length - 1].remove();
		}
	};

	let rowIndex = -1;

	return (
		<Dialog
			open={isPaletteOpen}
			onOpenChange={(open) => {
				if (!open) closePalette();
			}}
		>
			<DialogContent
				showCloseButton={false}
				className="top-[8%] max-w-xl translate-y-0 gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-xl"
			>
				<DialogTitle className="sr-only">
					Search and filter clips
				</DialogTitle>

				{/* Input row */}
				<div className="border-border/50 flex flex-wrap items-center gap-1.5 border-b px-4 py-3">
					<Search className="text-muted-foreground h-4 w-4 flex-none" />
					{inputTokens.map((t, i) => (
						<FilterToken
							key={`${t.variant}-${t.label}-${i}`}
							variant={t.variant}
							label={t.label}
							onRemove={t.remove}
						/>
					))}
					<input
						ref={inputRef}
						value={value}
						onChange={(e) => {
							const nextValue = e.target.value;
							setValue(nextValue);
							setHot(parsePaletteInput(nextValue).mode ? 0 : -1);
						}}
						onKeyDown={onKeyDown}
						placeholder={
							inputTokens.length > 0
								? "Search..."
								: "Type to search, or use # @ ! sort:"
						}
						maxLength={100}
						autoFocus
						className="text-foreground placeholder:text-muted-foreground min-w-28 flex-1 bg-transparent text-sm outline-none"
						role="combobox"
						aria-expanded="true"
						aria-controls="clip-palette-listbox"
						aria-activedescendant={
							hot === -1
								? "palette-search-submit"
								: flatRows[hot]
									? `palette-row-${hot}`
									: undefined
						}
					/>
					<button
						id="palette-search-submit"
						type="button"
						onClick={activateArrow}
						onMouseMove={() => setHot(-1)}
						className={cn(
							"border-border bg-sidebar text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-md border transition-colors focus-visible:ring-2 focus-visible:outline-none",
							hot === -1 &&
								"bg-accent text-foreground ring-ring ring-2"
						)}
						aria-label={
							mode
								? "Select highlighted option"
								: "Apply clip search"
						}
						title={mode ? "Select option" : "Apply search"}
					>
						<ArrowRight className="h-3.5 w-3.5" />
					</button>
				</div>

				{/* Results */}
				<div
					ref={listRef}
					id="clip-palette-listbox"
					role="listbox"
					className="max-h-[min(420px,60vh)] overflow-y-auto p-2"
				>
					{flatRows.length === 0 && (
						<div className="text-muted-foreground px-3 py-8 text-center text-sm">
							{mode
								? `No ${MODE_LABELS[mode]}s match "${query}"`
								: "Nothing to show"}
						</div>
					)}
					{sections.map((section) =>
						section.rows.length === 0 ? null : (
							<div key={section.heading}>
								<div className="text-muted-foreground/80 px-3 pt-3 pb-1 text-[11px] font-bold tracking-wider uppercase first:pt-1">
									{section.heading}
								</div>
								{section.rows.map((row) => {
									rowIndex += 1;
									const index = rowIndex;
									return (
										<div
											key={row.key}
											id={`palette-row-${index}`}
											data-row-index={index}
											role="option"
											aria-selected={hot === index}
											onMouseDown={(e) => {
												e.preventDefault();
												selectRow(index);
											}}
											onMouseMove={() => setHot(index)}
											className={cn(
												"flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
												hot === index
													? "bg-accent text-foreground"
													: "text-muted-foreground"
											)}
										>
											{row.content}
										</div>
									);
								})}
							</div>
						)
					)}
				</div>

				{/* Footer */}
				<div className="border-border/50 text-muted-foreground flex items-center gap-4 border-t px-4 py-2 text-[11px]">
					<span>↑↓ navigate</span>
					<span>
						↵{" "}
						{mode
							? mode === "sort"
								? "select"
								: "toggle"
							: "search"}
					</span>
					<span>⌫ remove filter</span>
					<span>esc close</span>
					{mode && (
						<span
							className={cn(
								"ml-auto font-semibold",
								MODE_COLORS[mode]
							)}
						>
							{MODE_LABELS[mode]} mode
						</span>
					)}
					{!mode && searchQuery.trim() && (
						<span className="ml-auto truncate">
							searching: &quot;{searchQuery.trim()}&quot;
						</span>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
