"use client";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { AlertTriangle } from "lucide-react";

interface InvalidatesScansPopoverProps {
	className?: string;
}

export function InvalidatesScansPopover({
	className,
}: InvalidatesScansPopoverProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={`inline-flex items-center justify-center rounded-lg p-1 transition-colors hover:bg-orange-500/20 ${className}`}
				>
					<AlertTriangle className="h-4 w-4 text-orange-400" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="w-80 border-0 p-0 drop-shadow"
				side="top"
			>
				<div className="flex items-start gap-2 rounded-md bg-orange-400/5 p-3">
					<AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
					<div>
						<p className="mb-1 text-sm font-bold text-orange-400">
							Scan Invalidation Warning
						</p>
						<p className="text-xs text-orange-200 sm:text-sm">
							Changing this setting may make previous or ongoing
							scans invalid. You may need to re-run scans after
							changing this setting.
						</p>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
