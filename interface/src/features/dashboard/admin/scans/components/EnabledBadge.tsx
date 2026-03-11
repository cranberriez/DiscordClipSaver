import { cn } from "@/lib/utils";

interface EnabledToggleBadgeProps {
	enabled: boolean;
	className?: string;
}

export function EnabledBadge({ enabled, className }: EnabledToggleBadgeProps) {
	return (
		<div className="flex h-full flex-col">
			<div className="flex h-7 items-center justify-center">
				<div
					className={cn(
						"h-1.5 w-1.5 rounded-full",
						enabled ? "bg-green-500" : "bg-red-500",
						className
					)}
				/>
			</div>
		</div>
	);
}
