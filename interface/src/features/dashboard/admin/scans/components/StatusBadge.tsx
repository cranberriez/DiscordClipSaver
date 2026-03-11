import { cn } from "@/lib/utils";

interface StatusBadgeProps {
	status?: string;
	grayscale?: boolean;
}

export function StatusBadge({ status, grayscale = false }: StatusBadgeProps) {
	if (!status) {
		return <Badge className="text-muted-foreground/50">Unscanned</Badge>;
	}

	if (grayscale) {
		return (
			<Badge className="text-muted-foreground border-border/50">
				{status}
			</Badge>
		);
	}

	const colorMap: Record<string, string> = {
		FAILED: "bg-red-500/10 text-red-400",
		CANCELLED: "bg-gray-500/10 text-gray-400",
		QUEUED: "bg-yellow-500/10 text-yellow-400",
		RUNNING: "bg-blue-500/10 text-blue-400 ",
		SUCCEEDED: "bg-green-500/10 text-green-400 ",
	};

	const customLabelMap: Record<string, string> = {
		FAILED: "FAILED",
		CANCELLED: "CANCELLED",
		QUEUED: "QUEUED",
		RUNNING: "RUNNING",
		SUCCEEDED: "SUCCEEDED",
	};

	const customColor = colorMap[status];
	const customLabel = customLabelMap[status] || status;

	return <Badge className={customColor}>{customLabel}</Badge>;
}

function Badge({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex h-9 w-24 items-center justify-center rounded-sm px-4 py-1 text-xs font-medium",
				className
			)}
		>
			{children}
		</div>
	);
}
