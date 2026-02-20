import { create } from "zustand";
import { persist } from "zustand/middleware";

interface VideoPlayerState {
	volume: number;
	setVolume: (volume: number) => void;
	muted: boolean;
	setMuted: (muted: boolean) => void;
	hasHydrated: boolean;
	setHasHydrated: (hasHydrated: boolean) => void;
}

export const useVideoPlayerStore = create<VideoPlayerState>()(
	persist(
		(set) => ({
			volume: 0.5,
			setVolume: (volume) => set({ volume }),
			muted: false,
			setMuted: (muted) => set({ muted }),
			hasHydrated: false,
			setHasHydrated: (hasHydrated) => set({ hasHydrated }),
		}),
		{
			name: "video-player-settings",
			onRehydrateStorage: () => (state) => {
				state?.setHasHydrated(true);
			},
		}
	)
);
