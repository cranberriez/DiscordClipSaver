import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SortType, SortOrder } from "@/lib/api/clip";

interface ClipFiltersState {
	// Selected filters
	selectedGuildId: string | null;
	selectedChannelIds: string[];
	selectedAuthorIds: string[];
	tagsAny: string[];
	tagsAll: string[];
	tagsExclude: string[];
	searchQuery: string;
	sortType: SortType;
	sortOrder: SortOrder;
	favoritesOnly: boolean;

	// Modal states
	isGuildModalOpen: boolean;
	isChannelModalOpen: boolean;
	isAuthorModalOpen: boolean;
	isTagModalOpen: boolean;

	// Command palette state
	isPaletteOpen: boolean;
	/** Pre-seeded palette input, e.g. "#" to open in channel mode */
	paletteSeed: string;

	// Actions
	setGuildId: (guildId: string | null) => void;
	setChannelIds: (channelIds: string[]) => void;
	setAuthorIds: (authorIds: string[]) => void;
	setTagsAny: (tags: string[]) => void;
	setTagsAll: (tags: string[]) => void;
	setTagsExclude: (tags: string[]) => void;
	setSearchQuery: (query: string) => void;
	setSortType: (type: SortType) => void;
	setSortOrder: (order: SortOrder) => void;
	setFavoritesOnly: (favoritesOnly: boolean) => void;

	// Modal actions
	openGuildModal: () => void;
	closeGuildModal: () => void;
	openChannelModal: () => void;
	closeChannelModal: () => void;
	openAuthorModal: () => void;
	closeAuthorModal: () => void;
	openTagModal: () => void;
	closeTagModal: () => void;

	// Palette actions
	openPalette: (seed?: string) => void;
	closePalette: () => void;

	// Reset
	resetFilters: () => void;
	/** Clear all filters but keep the selected guild and sort */
	clearFilters: () => void;
}

export const useClipFiltersStore = create<ClipFiltersState>()(
	persist(
		(set) => ({
			// Initial state
			selectedGuildId: null as string | null,
			selectedChannelIds: [] as string[],
			selectedAuthorIds: [] as string[],
			tagsAny: [] as string[],
			tagsAll: [] as string[],
			tagsExclude: [] as string[],
			searchQuery: "",
			sortType: "date" as SortType,
			sortOrder: "desc" as SortOrder,
			favoritesOnly: false,

			isGuildModalOpen: false,
			isChannelModalOpen: false,
			isAuthorModalOpen: false,
			isTagModalOpen: false,

			isPaletteOpen: false,
			paletteSeed: "",

			// Filter actions
			setGuildId: (guildId) =>
				set({
					selectedGuildId: guildId,
					// Reset channel, author, and tag filters when guild changes
					selectedChannelIds: [],
					selectedAuthorIds: [],
					tagsAny: [],
					tagsAll: [],
					tagsExclude: [],
				}),

			setChannelIds: (channelIds) =>
				set({ selectedChannelIds: channelIds }),

			setAuthorIds: (authorIds) => set({ selectedAuthorIds: authorIds }),

			setTagsAny: (tags) => set({ tagsAny: tags }),
			setTagsAll: (tags) => set({ tagsAll: tags }),
			setTagsExclude: (tags) => set({ tagsExclude: tags }),

			setSearchQuery: (query) => set({ searchQuery: query }),

			setSortType: (type) => set({ sortType: type }),
			setSortOrder: (order) => set({ sortOrder: order }),
			setFavoritesOnly: (favoritesOnly) =>
				set({ favoritesOnly: favoritesOnly }),

			// Modal actions
			openGuildModal: () => set({ isGuildModalOpen: true }),
			closeGuildModal: () => set({ isGuildModalOpen: false }),
			openChannelModal: () => set({ isChannelModalOpen: true }),
			closeChannelModal: () => set({ isChannelModalOpen: false }),
			openAuthorModal: () => set({ isAuthorModalOpen: true }),
			closeAuthorModal: () => set({ isAuthorModalOpen: false }),
			openTagModal: () => set({ isTagModalOpen: true }),
			closeTagModal: () => set({ isTagModalOpen: false }),

			// Palette actions
			openPalette: (seed = "") =>
				set({ isPaletteOpen: true, paletteSeed: seed }),
			closePalette: () => set({ isPaletteOpen: false, paletteSeed: "" }),

			// Reset
			resetFilters: () =>
				set({
					selectedGuildId: null,
					selectedChannelIds: [],
					selectedAuthorIds: [],
					tagsAny: [],
					tagsAll: [],
					tagsExclude: [],
					searchQuery: "",
					sortType: "date",
					favoritesOnly: false,
					sortOrder: "desc",
				}),

			clearFilters: () =>
				set({
					selectedChannelIds: [],
					selectedAuthorIds: [],
					tagsAny: [],
					tagsAll: [],
					tagsExclude: [],
					searchQuery: "",
					favoritesOnly: false,
				}),
		}),
		{
			name: "clip-filters-storage",
			// Only persist the filter values, not modal states
			partialize: (state) => ({
				selectedGuildId: state.selectedGuildId,
				selectedChannelIds: state.selectedChannelIds,
				selectedAuthorIds: state.selectedAuthorIds,
				tagsAny: state.tagsAny,
				tagsAll: state.tagsAll,
				tagsExclude: state.tagsExclude,
				searchQuery: state.searchQuery,
				sortType: state.sortType,
				favoritesOnly: state.favoritesOnly,
				sortOrder: state.sortOrder,
			}),
		}
	)
);
