"use client";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Info } from "lucide-react";

interface NotePopoverProps {
	note: string;
	className?: string;
}

export function NotePopover({ note, className }: NotePopoverProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={`inline-flex items-center justify-center rounded-lg p-1 transition-colors hover:bg-blue-500/20 ${className}`}
				>
					<Info className="h-4 w-4 text-blue-400" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="w-80 border-0 p-0 drop-shadow"
				side="top"
			>
				<div className="flex items-start gap-2 rounded-md bg-blue-400/5 p-3">
					<Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
					<div>
						<p className="mb-1 text-sm font-bold text-blue-400">
							Important Note
						</p>
						<p className="text-xs text-blue-200 sm:text-sm">
							{note}
						</p>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
