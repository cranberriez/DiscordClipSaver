import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import { useGuildTags } from "@/lib/queries/tags";
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
	const { tags: selectedTags, setTags } = useClipFiltersStore();
	const { data: tags = [] } = useGuildTags(guildId);
	const [search, setSearch] = useState("");

	const filteredTags = useMemo(() => {
		if (!search.trim()) return tags;
		const query = search.toLowerCase();
		return tags.filter((tag) => tag.name.toLowerCase().includes(query));
	}, [tags, search]);

	const toggleTag = (slug: string) => {
		setTags(
			selectedTags.includes(slug)
				? selectedTags.filter((tag) => tag !== slug)
				: [...selectedTags, slug]
		);
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="flex h-[80vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
				<DialogHeader className="shrink-0 border-b px-6 py-4">
					<DialogTitle className="flex items-center gap-2">
						<TagIcon className="h-5 w-5" />
						Filter by Tags
					</DialogTitle>
					<p className="text-muted-foreground text-sm">
						Clips matching more selected tags appear first.
					</p>
					<div className="mt-4 flex items-center gap-2">
						<div className="relative flex-1">
							<Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
							<Input
								placeholder="Search tags..."
								value={search}
								onChange={(event) =>
									setSearch(event.target.value)
								}
								className="pl-9"
							/>
						</div>
						{selectedTags.length > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setTags([])}
								className="text-muted-foreground hover:text-foreground shrink-0 gap-1 px-2"
							>
								<RotateCcw className="h-3 w-3" />
								Reset
							</Button>
						)}
					</div>
				</DialogHeader>

				<ScrollArea className="min-h-0 flex-1 p-6">
					<div className="flex flex-wrap gap-2 pb-6">
						{filteredTags.map((tag) => {
							const isSelected = selectedTags.includes(tag.slug);
							return (
								<button
									key={tag.id}
									onClick={() => toggleTag(tag.slug)}
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
			</DialogContent>
		</Dialog>
	);
}
