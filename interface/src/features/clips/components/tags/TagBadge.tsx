import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tag } from "@/lib/api/clip";

interface TagBadgeProps {
	tag: Tag;
	onRemove?: () => void;
	className?: string;
	size?: "sm" | "md";
}

export function TagBadge({ tag, onRemove, className, size = "md" }: TagBadgeProps) {
	// Calculate contrasting text color (simple version)
	// If needed, we can add a proper utility for this later
	const isDarkColor = (color: string) => {
		const hex = color.replace("#", "");
		const r = parseInt(hex.substr(0, 2), 16);
		const g = parseInt(hex.substr(2, 2), 16);
		const b = parseInt(hex.substr(4, 2), 16);
		const yiq = (r * 299 + g * 587 + b * 114) / 1000;
		return yiq < 128;
	};

	const style = tag.color
		? {
				backgroundColor: tag.color,
				color: isDarkColor(tag.color) ? "white" : "black",
				borderColor: "transparent",
		  }
		: undefined;

	return (
		<Badge
			variant="secondary"
			className={cn(
				"gap-1 transition-all hover:brightness-110",
				size === "sm" ? "text-[10px] px-1.5 py-0" : "px-2 py-0.5",
				className
			)}
			style={style}
		>
			<span className="truncate max-w-[150px]">{tag.name}</span>
			{onRemove && (
				<button
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
					className={cn(
						"rounded-full hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 p-0.5 -mr-1",
						size === "sm" ? "h-3 w-3" : "h-4 w-4"
					)}
				>
					<X className={cn("w-full h-full")} />
					<span className="sr-only">Remove {tag.name} tag</span>
				</button>
			)}
		</Badge>
	);
}
