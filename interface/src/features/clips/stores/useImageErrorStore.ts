import { create } from "zustand";

const MAX_ERRORS = 3;

interface ImageErrorState {
    errorCount: number;
    hasTooManyErrors: boolean;
    reportError: () => void;
    resetErrors: () => void;
}

export const useImageErrorStore = create<ImageErrorState>((set, get) => ({
    errorCount: 0,
    hasTooManyErrors: false,
    reportError: () => {
        const newErrorCount = get().errorCount + 1;
        if (newErrorCount >= MAX_ERRORS) {
            set({ hasTooManyErrors: true, errorCount: newErrorCount });
        } else {
            set({ errorCount: newErrorCount });
        }
    },
    resetErrors: () => set({ errorCount: 0, hasTooManyErrors: false }),
}));
