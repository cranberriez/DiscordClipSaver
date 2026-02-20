import { X } from "lucide-react";

interface CloseButtonProps {
	onClose: () => void;
}

export function CloseButton({ onClose }: CloseButtonProps) {
	return (
		<button
			onClick={onClose}
			className="absolute top-4 right-4 z-50 cursor-pointer rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
			aria-label="Close"
		>
			<X className="h-6 w-6" />
		</button>
	);
}
