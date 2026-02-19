import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import { useGuildTags } from "@/lib/queries/tags";
import { Tag } from "@/lib/api/clip";
import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search, Tag as TagIcon, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TagFilterModalProps {
	isOpen: boolean;
	onClose: () => void;
	guildId: string;
}

export function TagFilterModal({
	isOpen,
	onClose,
	guildId,
}: TagFilterModalProps) {
	const {
		tagsAny,
		tagsAll,
		tagsExclude,
		setTagsAny,
		setTagsAll,
		setTagsExclude,
	} = useClipFiltersStore();

	const { data: tags = [] } = useGuildTags(guildId);
	const [search, setSearch] = useState("");

	const filteredTags = useMemo(() => {
		if (!search.trim()) return tags;
		const query = search.toLowerCase();
		return tags.filter((t) => t.name.toLowerCase().includes(query));
	}, [tags, search]);

	const toggleAny = (slug: string) => {
		if (tagsAny.includes(slug)) {
			setTagsAny(tagsAny.filter((t) => t !== slug));
		} else {
			setTagsAny([...tagsAny, slug]);
			// Remove from exclude if present
			if (tagsExclude.includes(slug)) {
				setTagsExclude(tagsExclude.filter((t) => t !== slug));
			}
		}
	};

	const toggleAll = (slug: string) => {
		if (tagsAll.includes(slug)) {
			setTagsAll(tagsAll.filter((t) => t !== slug));
		} else {
			setTagsAll([...tagsAll, slug]);
			// Remove from exclude if present
			if (tagsExclude.includes(slug)) {
				setTagsExclude(tagsExclude.filter((t) => t !== slug));
			}
		}
	};

	const toggleExclude = (slug: string) => {
		if (tagsExclude.includes(slug)) {
			setTagsExclude(tagsExclude.filter((t) => t !== slug));
		} else {
			setTagsExclude([...tagsExclude, slug]);
			// Remove from any and all if present
			if (tagsAny.includes(slug)) {
				setTagsAny(tagsAny.filter((t) => t !== slug));
			}
			if (tagsAll.includes(slug)) {
				setTagsAll(tagsAll.filter((t) => t !== slug));
			}
		}
	};

	const resetFilters = () => {
		setTagsAny([]);
		setTagsAll([]);
		setTagsExclude([]);
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="flex h-[80vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
				<DialogHeader className="shrink-0 border-b px-6 py-4">
					<div className="flex items-center justify-between">
						<DialogTitle className="flex items-center gap-2">
							<TagIcon className="h-5 w-5" />
							Filter by Tags
						</DialogTitle>
					</div>
					<div className="mt-4 flex items-center gap-2">
						<div className="relative flex-1">
							<Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
							<Input
								placeholder="Search tags..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9"
							/>
						</div>
						{(tagsAny.length > 0 ||
							tagsAll.length > 0 ||
							tagsExclude.length > 0) && (
							<Button
								variant="ghost"
								size="sm"
								onClick={resetFilters}
								className="text-muted-foreground hover:text-foreground shrink-0 gap-1 px-2"
							>
								<RotateCcw className="h-3 w-3" />
								Reset
							</Button>
						)}
					</div>
				</DialogHeader>

				<div className="divide-border grid min-h-0 flex-1 grid-rows-3 divide-y">
					{/* ANY Section */}
					<Section
						title="Any"
						description="Has ANY of these tags"
						tags={filteredTags}
						selectedTags={tagsAny}
						onToggle={toggleAny}
						disabledTags={tagsExclude} // Cannot be in Any if Excluded
						activeColor="border-l-blue-500"
					/>

					{/* ALL Section */}
					<Section
						title="All"
						description="Has ALL of these tags"
						tags={filteredTags}
						selectedTags={tagsAll}
						onToggle={toggleAll}
						disabledTags={tagsExclude} // Cannot be in All if Excluded
						activeColor="border-l-green-500"
					/>

					{/* EXCLUDE Section */}
					<Section
						title="Exclude"
						description="Has NONE of these tags"
						tags={filteredTags}
						selectedTags={tagsExclude}
						onToggle={toggleExclude}
						disabledTags={[...tagsAny, ...tagsAll]} // Cannot be Excluded if in Any or All
						activeColor="border-l-red-500"
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}

interface SectionProps {
	title: string;
	description: string;
	tags: Tag[];
	selectedTags: string[];
	onToggle: (slug: string) => void;
	disabledTags: string[];
	activeColor?: string;
}

function Section({
	title,
	description,
	tags,
	selectedTags,
	onToggle,
	disabledTags,
	activeColor,
}: SectionProps) {
	return (
		<div className="bg-background/50 flex h-full min-h-0 flex-col">
			<div
				className={cn(
					"bg-muted/30 shrink-0 border-l-4 p-4",
					activeColor
				)}
			>
				<h3 className="text-sm font-semibold tracking-wider uppercase">
					{title}
				</h3>
				<p className="mt-0.5 text-xs opacity-80">{description}</p>
			</div>
			<ScrollArea className="flex-1 p-4">
				<div className="flex flex-wrap gap-2">
					{tags.map((tag) => {
						const isSelected = selectedTags.includes(tag.slug);
						const isDisabled = disabledTags.includes(tag.slug);

						// Don't show if disabled (user requirement: removed as option)
						if (isDisabled) return null;

						return (
							<button
								key={tag.id}
								onClick={() => onToggle(tag.slug)}
								className={cn(
									"rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all",
									isSelected
										? "border-transparent text-white shadow-sm"
										: "text-foreground hover:bg-muted/50 border-dashed"
								)}
								style={{
									backgroundColor: isSelected
										? tag.color || "#52525b"
										: "transparent",
									borderColor: !isSelected
										? tag.color || "#52525b"
										: undefined,
								}}
							>
								{tag.name}
							</button>
						);
					})}
				</div>
			</ScrollArea>
		</div>
	);
}
