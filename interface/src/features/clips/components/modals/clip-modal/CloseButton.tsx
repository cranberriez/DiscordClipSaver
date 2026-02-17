import { X } from "lucide-react";

interface CloseButtonProps {
    onClose: () => void;
}

export function CloseButton({ onClose }: CloseButtonProps) {
    return (
        <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
            aria-label="Close"
        >
            <X className="w-6 h-6" />
        </button>
    );
}
