import { useClipFiltersStore } from "../../stores/useClipFiltersStore";

export function FilterSubMenu() {
	const { favoritesOnly, setFavoritesOnly } = useClipFiltersStore();
	return (
		<div className="flex flex-col gap-1 p-2">
			<button
				onClick={() => setFavoritesOnly(!favoritesOnly)}
				className={`flex items-center justify-between rounded-md px-4 py-3 text-left transition-colors ${
					favoritesOnly
						? "bg-primary/10 text-primary font-medium"
						: "hover:bg-muted"
				}`}
			>
				Favorites Only
				{favoritesOnly && <span className="text-primary">✓</span>}
			</button>
		</div>
	);
}
