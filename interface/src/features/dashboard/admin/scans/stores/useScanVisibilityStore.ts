import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ScanStatusFilter = "all" | "ok" | "failed";
export type ScanSortBy = "name" | "clips" | "scanned" | "last_scan";

interface ScanVisibilityState {
	showDisabledChannels: boolean;
	simpleView: boolean;
	searchQuery: string;
	statusFilter: ScanStatusFilter;
	sortBy: ScanSortBy;
	toggleShowDisabledChannels: () => void;
	toggleSimpleView: () => void;
	setSearchQuery: (query: string) => void;
	setStatusFilter: (filter: ScanStatusFilter) => void;
	setSortBy: (sort: ScanSortBy) => void;
}

export const useScanVisibilityStore = create<ScanVisibilityState>()(
	persist(
		(set) => ({
			showDisabledChannels: true,
			simpleView: false,
			searchQuery: "",
			statusFilter: "all",
			sortBy: "name",
			toggleShowDisabledChannels: () =>
				set((state) => ({
					showDisabledChannels: !state.showDisabledChannels,
				})),
			toggleSimpleView: () =>
				set((state) => ({ simpleView: !state.simpleView })),
			setSearchQuery: (query) => set({ searchQuery: query }),
			setStatusFilter: (filter) => set({ statusFilter: filter }),
			setSortBy: (sort) => set({ sortBy: sort }),
		}),
		{
			name: "scan-visibility-storage",
		}
	)
);
