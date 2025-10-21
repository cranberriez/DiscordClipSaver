import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SortOrder = "desc" | "asc";

interface ClipFiltersState {
    // Selected filters
    selectedGuildId: string | null;
    selectedChannelIds: string[];
    selectedAuthorIds: string[];
    searchQuery: string;
    sortOrder: SortOrder;

    // Modal states
    isGuildModalOpen: boolean;
    isChannelModalOpen: boolean;
    isAuthorModalOpen: boolean;

    // Actions
    setGuildId: (guildId: string | null) => void;
    setChannelIds: (channelIds: string[]) => void;
    setAuthorIds: (authorIds: string[]) => void;
    setSearchQuery: (query: string) => void;
    setSortOrder: (order: SortOrder) => void;

    // Modal actions
    openGuildModal: () => void;
    closeGuildModal: () => void;
    openChannelModal: () => void;
    closeChannelModal: () => void;
    openAuthorModal: () => void;
    closeAuthorModal: () => void;

    // Reset
    resetFilters: () => void;
}

export const useClipFiltersStore = create<ClipFiltersState>()(
    persist(
        (set) => ({
            // Initial state
            selectedGuildId: null,
            selectedChannelIds: [],
            selectedAuthorIds: [],
            searchQuery: "",
            sortOrder: "desc",

            isGuildModalOpen: false,
            isChannelModalOpen: false,
            isAuthorModalOpen: false,

            // Filter actions
            setGuildId: (guildId) =>
                set({
                    selectedGuildId: guildId,
                    // Reset channel and author filters when guild changes
                    selectedChannelIds: [],
                    selectedAuthorIds: [],
                }),

            setChannelIds: (channelIds) =>
                set({ selectedChannelIds: channelIds }),

            setAuthorIds: (authorIds) => set({ selectedAuthorIds: authorIds }),

            setSearchQuery: (query) => set({ searchQuery: query }),

            setSortOrder: (order) => set({ sortOrder: order }),

            // Modal actions
            openGuildModal: () => set({ isGuildModalOpen: true }),
            closeGuildModal: () => set({ isGuildModalOpen: false }),
            openChannelModal: () => set({ isChannelModalOpen: true }),
            closeChannelModal: () => set({ isChannelModalOpen: false }),
            openAuthorModal: () => set({ isAuthorModalOpen: true }),
            closeAuthorModal: () => set({ isAuthorModalOpen: false }),

            // Reset
            resetFilters: () =>
                set({
                    selectedGuildId: null,
                    selectedChannelIds: [],
                    selectedAuthorIds: [],
                    searchQuery: "",
                    sortOrder: "desc",
                }),
        }),
        {
            name: "clip-filters-storage",
            // Only persist the filter values, not modal states
            partialize: (state) => ({
                selectedGuildId: state.selectedGuildId,
                selectedChannelIds: state.selectedChannelIds,
                selectedAuthorIds: state.selectedAuthorIds,
                searchQuery: state.searchQuery,
                sortOrder: state.sortOrder,
            }),
        }
    )
);
