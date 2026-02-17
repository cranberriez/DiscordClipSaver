"use client";

import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    MoreVertical,
    Link as LinkIcon,
    ExternalLink,
    Eye,
    Archive,
    Trash2,
    Undo2,
    Lock,
    Globe,
    Pencil,
    FileEdit,
} from "lucide-react";
import { FullClip } from "@/lib/api/clip";
import { useUser } from "@/lib/hooks/useUser";
import { useGuild } from "@/lib/hooks/useGuilds";
import {
    useUpdateVisibility,
    useArchiveClip,
    useUnarchiveClip,
    useDeleteClip,
    useRenameClip,
} from "@/lib/hooks/useClipActions";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ClipOptionsDropdownProps {
    clip: FullClip;
    triggerClassName?: string;
    variant?:
        | "default"
        | "destructive"
        | "outline"
        | "secondary"
        | "ghost"
        | "link";
    size?: "default" | "sm" | "lg" | "icon" | "icon-lg";
    isOnInfoBar?: boolean;
}

export function ClipOptionsDropdown({
    clip,
    triggerClassName,
    variant = "ghost",
    size = "icon",
    isOnInfoBar = false,
}: ClipOptionsDropdownProps) {
    const { data: userData } = useUser();
    const user = userData?.database;
    const { data: guild } = useGuild(clip.clip.guild_id);
    const updateVisibility = useUpdateVisibility();
    const archiveClip = useArchiveClip();
    const unarchiveClip = useUnarchiveClip();
    const deleteClip = useDeleteClip();
    const renameClip = useRenameClip();

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [newTitle, setNewTitle] = useState(clip.clip.title || "");

    // Permissions
    const isClipOwner = user?.id === clip.message.author_id;
    const isGuildOwner = user?.id === guild?.owner_id;
    const isAdmin = user?.roles === "admin";
    const canManageVisibility = isClipOwner || isGuildOwner || isAdmin;
    const canManageArchive = isGuildOwner || isAdmin; // Only server owner or admin
    const canDelete = isGuildOwner || isAdmin; // Only server owner or admin
    const canRename = isClipOwner || isGuildOwner || isAdmin;

    const hasAnyPermissions =
        canManageVisibility || canManageArchive || canDelete || canRename;

    // If on info bar and no permissions, show nothing
    if (isOnInfoBar && !hasAnyPermissions) {
        return null;
    }

    const isArchived = !!clip.clip.deleted_at;

    // Handlers
    const handleCopyLink = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Generate link with query params
        const link = `${window.location.origin}/clips?guildId=${clip.clip.guild_id}&channelIds=${clip.clip.channel_id}&clipId=${clip.clip.id}`;
        navigator.clipboard.writeText(link);
        toast.success("Link copied to clipboard");
    };

    const handleViewInDiscord = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Generate Discord link: https://discord.com/channels/{guild_id}/{channel_id}/{message_id}
        const link = `discord://discord.com/channels/${clip.clip.guild_id}/${clip.clip.channel_id}/${clip.clip.message_id}`;
        // Fallback to https if protocol fails (though browser usually handles it) or just open specific logic
        // We'll try opening new window
        window.open(link, "_blank");
    };

    const handleVisibilityChange = (
        visibility: "PUBLIC" | "UNLISTED" | "PRIVATE"
    ) => {
        updateVisibility.mutate({ clipId: clip.clip.id, visibility });
    };

    const handleArchive = () => {
        if (isArchived) {
            unarchiveClip.mutate(clip.clip.id);
        } else {
            archiveClip.mutate(clip.clip.id);
        }
    };

    const handleDelete = () => {
        deleteClip.mutate(clip.clip.id);
        setIsDeleteDialogOpen(false);
    };

    const handleRenameClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setNewTitle(clip.clip.title || "");
        setIsRenameDialogOpen(true);
    };

    const handleRenameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const title = newTitle.trim();

        if (title.length < 2) {
            toast.error("Title must be at least 2 characters long");
            return;
        }

        if (title.length > 254) {
            toast.error("Title must be less than 254 characters");
            return;
        }

        renameClip.mutate(
            { clipId: clip.clip.id, title },
            {
                onSuccess: () => {
                    setIsRenameDialogOpen(false);
                },
            }
        );
    };

    // Prevent click propagation to card
    const handleTriggerClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const defaultClasses =
        size === "icon"
            ? "h-6 w-6 rounded-full hover:bg-muted/50"
            : "text-muted-foreground hover:text-foreground";

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={handleTriggerClick}>
                    <Button
                        variant={variant}
                        size={size}
                        className={cn(
                            "focus-visible:ring-0 focus-visible:ring-offset-0 text-muted-foreground",
                            defaultClasses,
                            triggerClassName
                        )}
                    >
                        {isOnInfoBar ? (
                            <Pencil className="h-4 w-4" />
                        ) : (
                            <MoreVertical className="h-4 w-4" />
                        )}
                        <span className="sr-only">Open options</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-56"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Public Options - Hide if on InfoBar */}
                    {!isOnInfoBar && (
                        <>
                            <DropdownMenuItem onClick={handleCopyLink}>
                                <LinkIcon className="mr-2 h-4 w-4" />
                                <span>Copy Link</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleViewInDiscord}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                <span>View in Discord</span>
                            </DropdownMenuItem>
                        </>
                    )}

                    {canRename && (
                        <>
                            {(!isOnInfoBar || canManageVisibility) && (
                                <DropdownMenuSeparator />
                            )}
                            <DropdownMenuItem onClick={handleRenameClick}>
                                <FileEdit className="mr-2 h-4 w-4" />
                                <span>Rename</span>
                            </DropdownMenuItem>
                        </>
                    )}

                    {/* Visibility Options */}
                    {canManageVisibility && (
                        <>
                            {!isOnInfoBar && <DropdownMenuSeparator />}
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Eye className="mr-2 h-4 w-4" />
                                    <span>Visibility</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleVisibilityChange("PUBLIC")
                                        }
                                        className={
                                            clip.clip.visibility === "PUBLIC"
                                                ? "bg-accent"
                                                : ""
                                        }
                                    >
                                        <Globe className="mr-2 h-4 w-4" />
                                        <span>Public</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleVisibilityChange("UNLISTED")
                                        }
                                        className={
                                            clip.clip.visibility === "UNLISTED"
                                                ? "bg-accent"
                                                : ""
                                        }
                                    >
                                        <LinkIcon className="mr-2 h-4 w-4" />
                                        <span>Unlisted</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleVisibilityChange("PRIVATE")
                                        }
                                        className={
                                            clip.clip.visibility === "PRIVATE"
                                                ? "bg-accent"
                                                : ""
                                        }
                                    >
                                        <Lock className="mr-2 h-4 w-4" />
                                        <span>Private</span>
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        </>
                    )}

                    {/* Archive/Delete Options */}
                    {(canManageArchive || canDelete) && (
                        <>
                            <DropdownMenuSeparator />
                            {canManageArchive && (
                                <DropdownMenuItem onClick={handleArchive}>
                                    {isArchived ? (
                                        <>
                                            <Undo2 className="mr-2 h-4 w-4" />
                                            <span>Unarchive</span>
                                        </>
                                    ) : (
                                        <>
                                            <Archive className="mr-2 h-4 w-4" />
                                            <span>Archive</span>
                                        </>
                                    )}
                                </DropdownMenuItem>
                            )}
                            {canDelete && (
                                <DropdownMenuItem
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            )}
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <AlertDialogContent onClick={e => e.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the clip and its associated message from the
                            database.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Rename Dialog */}
            <Dialog
                open={isRenameDialogOpen}
                onOpenChange={setIsRenameDialogOpen}
            >
                <DialogContent onClick={e => e.stopPropagation()}>
                    <form onSubmit={handleRenameSubmit}>
                        <DialogHeader>
                            <DialogTitle>Rename Clip</DialogTitle>
                            <DialogDescription>
                                Enter a new title for this clip. This will
                                override the default generated name.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Title</Label>
                                <Input
                                    id="name"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    placeholder="Enter clip title..."
                                    className="col-span-3"
                                    autoFocus
                                    maxLength={254}
                                    minLength={2}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsRenameDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={renameClip.isPending}
                            >
                                {renameClip.isPending
                                    ? "Saving..."
                                    : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
