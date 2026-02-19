"use client";

import { useState } from "react";
import { Plus, Trash2, Tag as TagIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
	useGuildTags,
	useCreateTag,
	useDeleteGuildTag,
} from "@/lib/queries/tags";
import { TagBadge } from "@/features/clips/components/tags/TagBadge";
import { toast } from "sonner";
import type { Tag } from "@/lib/api/clip";

interface TagManagementProps {
	guildId: string;
}

const PRESET_COLORS = [
	"#ef4444", // red-500
	"#f97316", // orange-500
	"#eab308", // yellow-500
	"#22c55e", // green-500
	"#06b6d4", // cyan-500
	"#3b82f6", // blue-500
	"#a855f7", // purple-500
	"#ec4899", // pink-500
	"#64748b", // slate-500
];

export function TagManagement({ guildId }: TagManagementProps) {
	const { data: tags, isLoading } = useGuildTags(guildId);
	const createTag = useCreateTag();

	// Local state for new tag
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [newTagName, setNewTagName] = useState("");
	const [newTagColor, setNewTagColor] = useState<string | null>(null);

	const handleCreate = () => {
		if (!newTagName.trim()) return;

		createTag.mutate(
			{
				guildId,
				name: newTagName.trim(),
				color: newTagColor,
			},
			{
				onSuccess: () => {
					setNewTagName("");
					setNewTagColor(null);
					setIsCreateOpen(false);
					toast.success("Tag created successfully");
				},
				onError: (error) => {
					toast.error(error.message || "Failed to create tag");
				},
			}
		);
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="relative max-w-sm flex-1">
					<Input placeholder="Search tags..." className="pl-8" />
					<SearchIcon className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
				</div>
				<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="mr-2 h-4 w-4" />
							Create Tag
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create New Tag</DialogTitle>
							<DialogDescription>
								Add a new tag to organize clips in this server.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									value={newTagName}
									onChange={(e) =>
										setNewTagName(e.target.value)
									}
									placeholder="e.g. Funny, Epic Fail"
									maxLength={32}
								/>
							</div>
							<div className="grid gap-2">
								<Label>Color (Optional)</Label>
								<div className="flex flex-wrap gap-2">
									{PRESET_COLORS.map((color) => (
										<button
											key={color}
											type="button"
											onClick={() =>
												setNewTagColor(
													color === newTagColor
														? null
														: color
												)
											}
											className={`h-8 w-8 rounded-full border-2 transition-all ${
												newTagColor === color
													? "border-foreground scale-110"
													: "border-transparent hover:scale-105"
											}`}
											style={{ backgroundColor: color }}
											aria-label={`Select color ${color}`}
										/>
									))}
									<button
										type="button"
										onClick={() => setNewTagColor(null)}
										className={`border-muted-foreground/50 hover:border-muted-foreground flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed transition-all ${
											newTagColor === null
												? "border-foreground"
												: ""
										}`}
										aria-label="No color"
									>
										<span className="text-xs">None</span>
									</button>
								</div>
							</div>

							{/* Preview */}
							<div className="mt-2">
								<Label className="text-muted-foreground text-xs">
									Preview
								</Label>
								<div className="mt-1 flex items-center">
									<TagBadge
										tag={{
											id: "preview",
											name: newTagName || "Tag Name",
											slug: "preview",
											color: newTagColor,
											guild_id: guildId,
											created_at: new Date(),
											is_active: true,
											created_by_user_id: "preview",
										}}
									/>
								</div>
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setIsCreateOpen(false)}
							>
								Cancel
							</Button>
							<Button
								onClick={handleCreate}
								disabled={
									!newTagName.trim() || createTag.isPending
								}
							>
								{createTag.isPending && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								Create Tag
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{isLoading ? (
				<div className="flex justify-center py-8">
					<Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
				</div>
			) : tags?.length === 0 ? (
				<div className="animate-in fade-in-50 flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
					<div className="bg-muted flex h-20 w-20 items-center justify-center rounded-full">
						<TagIcon className="text-muted-foreground h-10 w-10" />
					</div>
					<h3 className="mt-4 text-lg font-semibold">
						No tags created
					</h3>
					<p className="text-muted-foreground mt-2 mb-4 max-w-sm text-sm">
						Tags help you organize and filter clips. Create your
						first tag to get started.
					</p>
					<Button onClick={() => setIsCreateOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Create Tag
					</Button>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{tags?.map((tag) => (
						<div
							key={tag.id}
							className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 shadow-sm transition-colors"
						>
							<TagBadge tag={tag} />

							<DeleteTagDialog tag={tag} guildId={guildId} />
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function SearchIcon(props: any) {
	return (
		<svg
			{...props}
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<circle cx="11" cy="11" r="8" />
			<path d="m21 21-4.3-4.3" />
		</svg>
	);
}

function DeleteTagDialog({ tag, guildId }: { tag: Tag; guildId: string }) {
	const [open, setOpen] = useState(false);
	const deleteTag = useDeleteGuildTag();

	const handleDelete = () => {
		deleteTag.mutate(
			{ guildId, tagId: tag.id },
			{
				onSuccess: () => {
					toast.success("Tag deleted");
					setOpen(false);
				},
				onError: (error) => {
					toast.error(
						error instanceof Error
							? error.message
							: "Failed to delete tag"
					);
				},
			}
		);
	};

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="text-muted-foreground hover:text-destructive h-8 w-8"
				>
					<Trash2 className="h-4 w-4" />
					<span className="sr-only">Delete</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Tag</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete the tag &quot;{tag.name}
						&quot;? This will remove it from all clips that use it.
						This action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={deleteTag.isPending}
					>
						{deleteTag.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						Delete
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
