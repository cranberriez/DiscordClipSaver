import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import type { SortType, SortOrder } from "@/lib/api/clip";

export function SortSubMenu() {
	const { sortType, sortOrder, setSortType, setSortOrder } =
		useClipFiltersStore();

	const setSort = (type: SortType, order: SortOrder) => {
		setSortType(type);
		setSortOrder(order);
	};

	const options = [
		{ label: "DATE", isHeader: true },
		{ type: "date", order: "desc", label: "Newest First" },
		{ type: "date", order: "asc", label: "Oldest First" },
		{ label: "DURATION", isHeader: true },
		{ type: "duration", order: "desc", label: "Longest First" },
		{ type: "duration", order: "asc", label: "Shortest First" },
		{ label: "LIKES", isHeader: true },
		{ type: "likes", order: "desc", label: "Most Liked" },
		{ label: "OTHER", isHeader: true },
		{ type: "random", order: "desc", label: "Randomize" },
	] as const;

	return (
		<div className="flex flex-col gap-1 p-2">
			{options.map((opt, i) => {
				if ("isHeader" in opt) {
					return (
						<div
							key={`header-${i}`}
							className="text-foreground/50 px-4 py-2 text-xs font-semibold tracking-wider"
						>
							{opt.label}
						</div>
					);
				}

				const isSelected =
					opt.type === sortType &&
					(opt.type === "random" || opt.order === sortOrder);

				return (
					<button
						key={`${opt.type}-${opt.order}`}
						onClick={() =>
							setSort(
								opt.type as SortType,
								opt.order as SortOrder
							)
						}
						className={`flex items-center justify-between rounded-md px-4 py-3 text-left transition-colors ${
							isSelected
								? "bg-primary/10 text-primary font-medium"
								: "hover:bg-muted"
						}`}
					>
						<span>{opt.label}</span>
						{isSelected && <span className="text-primary">✓</span>}
					</button>
				);
			})}
		</div>
	);
}
