import { create } from "zustand";

interface VideoPlayerState {
    volume: number;
    setVolume: (volume: number) => void;
}

export const useVideoPlayerStore = create<VideoPlayerState>()(set => ({
    volume: 1.0, // Default to 100% volume
    setVolume: volume => set({ volume }),
}));
