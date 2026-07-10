"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterTokenVariant =
	| "channel"
	| "author"
	| "tag"
	| "search"
	| "favorite";

const VARIANT_CLASSES: Record<FilterTokenVariant, string> = {
	channel: "border-primary/45 bg-primary/20 text-primary-foreground/90",
	author: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100/90",
	tag: "border-amber-500/40 bg-amber-500/15 text-amber-100/90",
	search: "border-border bg-accent/60 text-foreground/90",
	favorite: "border-rose-500/40 bg-rose-500/15 text-rose-100/90",
};

const VARIANT_PREFIX: Record<FilterTokenVariant, string> = {
	channel: "#",
	author: "@",
	tag: "◆",
	search: "🔍",
	favorite: "♥",
};

interface FilterTokenProps {
	variant: FilterTokenVariant;
	label: string;
	onRemove?: () => void;
	className?: string;
}

/**
 * A pill representing one active filter (channel, author, tag, search text,
 * or the favorites flag). Shared between the token strip and the palette.
 */
export function FilterToken({
	variant,
	label,
	onRemove,
	className,
}: FilterTokenProps) {
	return (
		<span
			className={cn(
				"inline-flex h-6 max-w-56 flex-none items-center gap-1.5 rounded-md border py-0 pl-2 text-xs font-medium whitespace-nowrap",
				onRemove ? "pr-0.5" : "pr-2",
				VARIANT_CLASSES[variant],
				className
			)}
		>
			<span className="font-mono text-[10px] opacity-60">
				{VARIANT_PREFIX[variant]}
			</span>
			<span className="truncate">{label}</span>
			{onRemove && (
				<button
					type="button"
					onClick={onRemove}
					className="inline-flex h-4 w-4 flex-none cursor-pointer items-center justify-center rounded-sm opacity-65 transition-opacity hover:bg-white/15 hover:opacity-100"
					aria-label={`Remove filter: ${label}`}
				>
					<X className="h-3 w-3" />
				</button>
			)}
		</span>
	);
}
