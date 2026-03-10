interface EnabledToggleBadgeProps {
	enabled: boolean;
	onToggle: () => void;
}

/**
 * Clickable enabled/disabled badge.
 * - Resting: shows current state with solid styling.
 * - Hover: dashed border, no background, text color of the *opposite* state.
 */
export function EnabledToggleBadge({ enabled, onToggle }: EnabledToggleBadgeProps) {
	return (
		<button
			onClick={onToggle}
			className={[
				"shrink-0 cursor-pointer rounded border px-2 py-0.5 text-xs font-medium transition-all select-none",
				enabled
					? "hover:border-muted-foreground/50 hover:text-muted-foreground border-green-600/40 bg-green-600/20 text-green-500 hover:border-dashed hover:bg-transparent"
					: "border-border text-muted-foreground hover:border-dashed hover:border-green-600/50 hover:bg-transparent hover:text-green-500",
			].join(" ")}
		>
			{enabled ? "Enabled" : "Disabled"}
		</button>
	);
}
