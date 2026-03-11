import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { RefreshCw, EyeOff, Eye, Search, Layers } from "lucide-react";
import {
	useScanVisibilityStore,
	type ScanStatusFilter,
	type ScanSortBy,
} from "../stores/useScanVisibilityStore";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { label: string; value: ScanStatusFilter }[] = [
	{ label: "All", value: "all" },
	{ label: "OK", value: "ok" },
	{ label: "Failed", value: "failed" },
];

interface ScanToolbarProps {
	onRefresh: () => void;
}

export function ScanToolbar({ onRefresh }: ScanToolbarProps) {
	const {
		simpleView,
		searchQuery,
		statusFilter,
		sortBy,
		showDisabledChannels,
		toggleShowDisabledChannels,
		toggleSimpleView,
		setSearchQuery,
		setStatusFilter,
		setSortBy,
	} = useScanVisibilityStore();

	return (
		<div className="flex flex-wrap items-center gap-4">
			{/* Search */}
			<div className="relative min-w-40 flex-1 sm:max-w-52">
				<Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
				<Input
					placeholder="Search channels..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="h-8 pl-8 text-sm"
				/>
			</div>

			{/* Status filter */}
			<div className="bg-input/30 border-input flex items-center rounded-md border p-0.5">
				{STATUS_FILTERS.map((btn) => (
					<button
						key={btn.value}
						onClick={() => setStatusFilter(btn.value)}
						className={[
							"h-7.5 rounded-md px-3 text-xs font-medium transition-colors",
							statusFilter === btn.value
								? "bg-muted text-foreground"
								: "text-muted-foreground hover:text-foreground",
						]
							.filter(Boolean)
							.join(" ")}
					>
						{btn.value === "ok" && (
							<span className="mr-1 text-green-500">✓</span>
						)}
						{btn.value === "failed" && (
							<span className="text-destructive mr-1">△</span>
						)}
						{btn.label}
					</button>
				))}
			</div>

			{/* Sort */}
			<div className="flex items-center gap-1.5">
				<span className="text-muted-foreground text-xs">Sort:</span>
				<Select
					value={sortBy}
					onValueChange={(v) => setSortBy(v as ScanSortBy)}
				>
					<SelectTrigger className="h-8 w-28 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="name">name</SelectItem>
						<SelectItem value="clips">clips</SelectItem>
						<SelectItem value="scanned">scanned</SelectItem>
						<SelectItem value="last_scan">last scan</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Right controls */}
			<div className="ml-auto flex items-center gap-1">
				<Button
					onClick={toggleShowDisabledChannels}
					variant="ghost"
					size="sm"
					className="text-muted-foreground hover:text-foreground h-8 text-xs"
				>
					{showDisabledChannels ? (
						<>
							<EyeOff className="mr-1 h-3.5 w-3.5" />
							Hide Disabled
						</>
					) : (
						<>
							<Eye className="mr-1 h-3.5 w-3.5" />
							Show Disabled
						</>
					)}
				</Button>
				<Button
					onClick={onRefresh}
					variant="ghost"
					size="sm"
					className="text-muted-foreground hover:text-foreground h-8 text-xs"
				>
					<RefreshCw className="mr-1 h-3.5 w-3.5" />
					Refresh
				</Button>
				{/* <Button
					onClick={toggleSimpleView}
					variant={simpleView ? "secondary" : "ghost"}
					size="sm"
					className={cn(
						"text-muted-foreground hover:text-foreground h-8 text-xs",
						simpleView && "text-foreground"
					)}
				>
					<Layers className="mr-1 h-3.5 w-3.5" />
					Simple View
				</Button> */}
			</div>
		</div>
	);
}
