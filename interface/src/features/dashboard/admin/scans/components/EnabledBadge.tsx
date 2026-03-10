interface EnabledToggleBadgeProps {
	enabled: boolean;
}

/**
 * Clickable enabled/disabled badge.
 * - Resting: shows current state with solid styling.
 * - Hover: dashed border, no background, text color of the *opposite* state.
 */
export function EnabledBadge({ enabled }: EnabledToggleBadgeProps) {
	return (
		<div
			className={[
				"shrink-0 cursor-pointer rounded border px-2 py-0.5 text-xs font-medium transition-all select-none",
				enabled
					? "border-green-600/40 bg-green-600/20 text-green-500"
					: "border-border text-muted-foreground",
			].join(" ")}
		>
			{enabled ? "Enabled" : "Disabled"}
		</div>
	);
}
