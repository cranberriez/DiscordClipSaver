import { create } from "zustand";
import { persist } from "zustand/middleware";

interface VideoPlayerState {
    volume: number;
    setVolume: (volume: number) => void;
}

export const useVideoPlayerStore = create<VideoPlayerState>()(
    persist(
        set => ({
            volume: 1.0,
            setVolume: volume => set({ volume }),
        }),
        { name: "video-player-settings" }
    )
);
