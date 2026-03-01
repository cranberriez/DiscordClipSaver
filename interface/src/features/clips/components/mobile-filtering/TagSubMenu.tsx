import { useState, useMemo } from "react";
import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import { useGuildTags } from "@/lib/queries/tags";

export function TagSubMenu({ guildId }: { guildId: string }) {
	const {
		tagsAny,
		setTagsAny,
		tagsAll,
		tagsExclude,
		setTagsAll,
		setTagsExclude,
	} = useClipFiltersStore();
	const { data: tags = [], isLoading } = useGuildTags(guildId);
	const [search, setSearch] = useState("");

	const filteredTags = useMemo(() => {
		if (!search.trim()) return tags;
		const query = search.toLowerCase();
		return tags.filter((t) => t.name.toLowerCase().includes(query));
	}, [tags, search]);

	const toggleTag = (slug: string) => {
		if (tagsAny.includes(slug)) {
			setTagsAny(tagsAny.filter((t) => t !== slug));
		} else {
			setTagsAny([...tagsAny, slug]);
			if (tagsExclude.includes(slug))
				setTagsExclude(tagsExclude.filter((t) => t !== slug));
			if (tagsAll.includes(slug))
				setTagsAll(tagsAll.filter((t) => t !== slug));
		}
	};

	const handleReset = () => {
		setTagsAny([]);
		setTagsAll([]);
		setTagsExclude([]);
	};

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<div className="flex flex-col gap-3 border-b p-4">
				<div className="relative">
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
						onClick={handleReset}
						className="text-muted-foreground hover:text-foreground -mx-2 h-8 justify-start px-2"
					>
						<RotateCcw className="mr-2 h-4 w-4" />
						Reset all tags
					</Button>
				)}
			</div>

			<ScrollArea className="flex-1 p-4">
				{isLoading ? (
					<div className="text-muted-foreground py-8 text-center text-sm">
						Loading tags...
					</div>
				) : filteredTags.length === 0 ? (
					<div className="text-muted-foreground py-8 text-center text-sm">
						{search ? "No tags match your search" : "No tags found"}
					</div>
				) : (
					<div className="flex flex-wrap gap-2 pb-4">
						{filteredTags.map((tag) => {
							const isSelected = tagsAny.includes(tag.slug);
							const isAll = tagsAll.includes(tag.slug);
							const isExclude = tagsExclude.includes(tag.slug);

							let customStyles = {};
							let stateClass =
								"text-foreground hover:bg-muted/50 border-dashed";

							if (isSelected || isAll) {
								stateClass =
									"border-transparent text-white shadow-sm";
								customStyles = {
									backgroundColor: tag.color || "#52525b",
								};
							} else if (isExclude) {
								stateClass =
									"border-red-500/50 text-red-500 hover:bg-red-500/10";
							} else {
								customStyles = {
									borderColor: tag.color || "#52525b",
								};
							}

							return (
								<button
									key={tag.id}
									onClick={() => toggleTag(tag.slug)}
									className={cn(
										"rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all",
										stateClass
									)}
									style={customStyles}
								>
									{tag.name}
								</button>
							);
						})}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
