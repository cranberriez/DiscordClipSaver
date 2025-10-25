import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ScanVisibilityState {
    showDisabledChannels: boolean;
    toggleShowDisabledChannels: () => void;
}

export const useScanVisibilityStore = create<ScanVisibilityState>()(
    persist(
        set => ({
            showDisabledChannels: true,
            toggleShowDisabledChannels: () =>
                set(state => ({
                    showDisabledChannels: !state.showDisabledChannels,
                })),
        }),
        {
            name: "scan-visibility-storage",
        }
    )
);
